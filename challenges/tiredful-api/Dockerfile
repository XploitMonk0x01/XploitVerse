FROM python:3.8-slim

WORKDIR /app

# Install system dependencies if needed (e.g. gcc for cffi)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . /app/

RUN python3 /app/Tiredful_API/manage.py migrate --noinput && \
    python3 /app/Tiredful_API/manage.py collectstatic --noinput

RUN echo "FLAG{xv_tiredful_api_token_cracked}" > /flag.txt

WORKDIR /app/Tiredful_API/

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "Tiredful_API.wsgi", "--workers=2", "--timeout=60"]
