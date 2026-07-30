import json
import time
from starlette.middleware.base import BaseHTTPMiddleware
# from starlette.responses import JSONResponse
from datetime import datetime, timezone
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from api.core.security import decode_access_token
from api.core.db import engine
from api.database import ActivityLog


MAX_LOG_BODY = 64 * 1024  # opsi: batasi ukuran body yang dilog (64KB)


async def save_log_to_db(log: ActivityLog) -> None:
    with Session(engine) as db:
        db.add(log)
        db.commit()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.perf_counter()
        auth_header = request.headers.get("authorization", "")

        # Deteksi tipe konten yang mengandung file / stream besar
        ct = request.headers.get("content-type", "").lower()
        cl = request.headers.get("content-length")
        content_len = int(cl) if cl and cl.isdigit() else None

        is_mutation = request.method in {"POST", "PUT", "PATCH"}
        is_multipart = ct.startswith("multipart/form-data")
        is_octet = ct.startswith("application/octet-stream")

        # RULE: hanya baca body jika aman (bukan multipart/octet & tidak kelewat besar)
        should_read_body = (
            is_mutation
            and not is_multipart
            and not is_octet
            and (content_len is None or content_len <= MAX_LOG_BODY)
        )

        body_bytes = None
        if should_read_body:
            try:
                body_bytes = await request.body()  # cached oleh Starlette utk JSON/urlencoded
            except Exception:
                body_bytes = None  # jangan ganggu flow kalau gagal

        # Lanjutkan request ke handler
        response = await call_next(request)

        try:
            # Decode token → user
            if auth_header.lower().startswith("bearer "):
                token = auth_header.split(" ", 1)[1].strip()
                token_data = decode_access_token(token)
                id_user = token_data.sub

                payload = {}

                if qp := request.query_params.multi_items():
                    payload["query"] = qp
                if pp := request.path_params:
                    payload["path"] = pp

                if should_read_body and body_bytes:
                    try:
                        # batasi ukuran parse
                        if len(body_bytes) > MAX_LOG_BODY:
                            payload["body"] = {"_truncated": True}
                        else:
                            payload["body"] = json.loads(body_bytes)
                    except json.JSONDecodeError:
                        # bukan JSON → jangan paksa simpan
                        payload["body"] = None
                else:
                    # tandai kalau kita skip supaya jelas di log
                    if is_multipart or is_octet:
                        payload["_body_skipped"] = "file_upload_or_binary"
                    elif content_len and content_len > MAX_LOG_BODY:
                        payload["_body_skipped"] = f"body_over_{MAX_LOG_BODY}_bytes"

                log = ActivityLog(
                    id_user=id_user,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    path=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    timestamp=datetime.now(timezone.utc),
                    duration=time.perf_counter() - start_time,
                    payload=payload or None,
                    # response=response.body if response.status_code >= 400 else None, # broken
                )

                # Tambahkan task tanpa menimpa background yg sudah ada
                if isinstance(getattr(response, "background", None), BackgroundTasks):
                    response.background.add_task(save_log_to_db, log)
                else:
                    response.background = BackgroundTasks()
                    response.background.add_task(save_log_to_db, log)

        except Exception:
            # Jangan sampai logging merusak response asli
            pass

        return response
