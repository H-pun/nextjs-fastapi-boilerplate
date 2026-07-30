FROM python:3.12-slim

ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . ./api

ENV API_HOST=0.0.0.0 \
    API_PORT=8000 \
    API_WORKERS=1

EXPOSE 8000
# jalankan server
CMD ["bash", "-lc", "exec gunicorn api.index:app -k uvicorn.workers.UvicornWorker -b ${API_HOST}:${API_PORT} -w ${API_WORKERS} --timeout 60"]
