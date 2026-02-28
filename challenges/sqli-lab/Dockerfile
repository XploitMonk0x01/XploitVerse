FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip sqlite3 \
    curl nano less \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask==3.1.0

WORKDIR /app

COPY app.py /app/app.py
COPY setup_db.py /app/setup_db.py
COPY templates/ /app/templates/

# Create and seed the database
RUN python3 /app/setup_db.py

# Flag only root can read
RUN echo "FLAG{xv_sqli_database_compromised}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

# Flag in the database (users must dump it via SQLi)
# Already seeded inside setup_db.py

EXPOSE 5000
CMD ["python3", "/app/app.py"]
