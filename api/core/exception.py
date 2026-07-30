import json
import logging

from fastapi import FastAPI, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError

from pydantic import ValidationError
from sqlalchemy.exc import NoResultFound, IntegrityError, ProgrammingError
from httpx import HTTPError, HTTPStatusError
from jwt import ExpiredSignatureError, InvalidTokenError
from jwt.exceptions import PyJWTError


logger = logging.getLogger(__name__)


def _build_validation_errors(exc, title):
    return {
        "errors": [
            {
                "title": title,
                "source": "/".join(map(str, error["loc"])),
                "message": error["msg"],
            }
            for error in exc.errors()
        ]
    }


def _build_error_dict(title, message):
    return {
        "errors":
            {
                "title": title,
                "message": message,
            }
    }


async def jwt_error_handler(request, exc):
    if isinstance(exc, ExpiredSignatureError):
        detail = "Token has expired"
        code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, InvalidTokenError):
        detail = "Invalid token"
        code = status.HTTP_401_UNAUTHORIZED
    else:
        detail = "Authentication failed"
        code = status.HTTP_401_UNAUTHORIZED

    return JSONResponse(
        status_code=code,
        content=jsonable_encoder(
            _build_error_dict("JWT Error", detail)
        ),
    )


async def req_validation_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder(
            _build_validation_errors(exc, "Request Validation Error")
        ),
    )


async def validation_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder(
            _build_validation_errors(exc, "Pydantic Validation Error")
        ),
    )


async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            _build_error_dict("HTTP Exception", exc.detail)
        ),
    )


async def http_error_handler(request, exc: HTTPError):
    if exc.response is None:
        logger.exception("HTTPError without response: %s", str(exc))
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=_build_error_dict("Http Error", "No response received from upstream service")
        )

    try:
        data = json.loads(exc.response.text)
    except (ValueError, AttributeError):
        data = {}

    message = data.get("error_message") or data.get("message") or str(exc)

    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content=jsonable_encoder(
            _build_error_dict("Http Error", message)
        )
    )


async def http_status_error_handler(request, exc: HTTPStatusError):
    try:
        data = exc.response.json()
    except Exception:
        try:
            data = json.loads(exc.response.text)
        except Exception:
            data = {}

    message = data.get("detail") or data.get("message") or exc.response.text

    return JSONResponse(
        status_code=exc.response.status_code,
        content=jsonable_encoder(
            _build_error_dict("External Service Error", message)
        )
    )


async def unhandled_exception_handler(request, exc):
    logger.exception("Unhandled Exception: %s", str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=jsonable_encoder(
            _build_error_dict("Internal Server Error", "Internal Server Error")
        )
    )


async def attribute_error_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder(
            _build_error_dict("Attribute Error", str(exc))
        )
    )


async def sql_error_handler(request, exc):
    logger.exception(str(exc.orig))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=jsonable_encoder(
            _build_error_dict("Internal Server Error", "Database error occurred")
        )
    )


async def no_result_found_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=jsonable_encoder(
            _build_error_dict("Not Found Error", str(exc))
        )
    )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(ValidationError, validation_handler)
    app.add_exception_handler(RequestValidationError, req_validation_handler)
    app.add_exception_handler(AttributeError, attribute_error_handler)
    app.add_exception_handler(NoResultFound, no_result_found_handler)
    app.add_exception_handler(IntegrityError, sql_error_handler)
    app.add_exception_handler(ProgrammingError, sql_error_handler)
    app.add_exception_handler(HTTPError, http_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(HTTPStatusError, http_status_error_handler)
    app.add_exception_handler(PyJWTError, jwt_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
