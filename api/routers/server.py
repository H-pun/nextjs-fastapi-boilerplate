import time
import mimetypes
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.core.deps import S3ClientDep
from api.core.config import settings

router = APIRouter()
START_TIME = time.time()


@router.get("/health")
def health():
    """Liveness probe: proses hidup."""
    dt = datetime.now().astimezone()
    return {
        "status": "ok",
        "uptime_sec": int(time.time() - START_TIME),
        "time": f"{dt.strftime('%a')}, {dt.day} {dt.strftime('%b %Y, %I:%M %p')} {dt.isoformat(timespec="minutes")[-6:]} {dt.tzname()}",
        "service": "api",
    }


@router.get("/preview")
async def preview_file(s3: S3ClientDep, filename: str):
    obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=filename)

    # Deteksi otomatis mime type berdasarkan ekstensi
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"

    return StreamingResponse(
        obj["Body"],
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
