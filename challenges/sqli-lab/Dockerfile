FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip sqlite3 \
    curl nano less openssh-server \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd \
    && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && useradd -m -s /bin/bash student && echo "student:student" | chpasswd

RUN pip3 install --no-cache-dir flask==3.1.0

WORKDIR /app

COPY app.py /app/app.py
COPY setup_db.py /app/setup_db.py

# Create and seed the database
RUN python3 /app/setup_db.py

# Flag only root can read
RUN echo "FLAG{xv_sqli_database_compromised}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

EXPOSE 22 5000
CMD ["sh", "-c", "service ssh start 2>/dev/null || /usr/sbin/sshd; python3 /app/app.py"]
