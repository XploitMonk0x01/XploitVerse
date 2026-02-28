FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip curl nano less \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask==3.1.0

WORKDIR /app
COPY app.py /app/app.py

# ---- Flag 1: Reflected XSS (user demonstrates in prompt) ----
# ---- Flag 2: Stored XSS (via guestbook) ----
# ---- Flag 3: IDOR on user profiles ----
# ---- Flag 4: SSRF via URL fetch ----
# ---- Flag 5: Directory traversal ----

# Hidden admin flag
RUN mkdir -p /opt/secret && \
    echo "FLAG{xv_owasp_ssrf_internal_access}" > /opt/secret/admin_key.txt && \
    chmod 644 /opt/secret/admin_key.txt

# Root flag
RUN echo "FLAG{xv_owasp_path_traversal}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

EXPOSE 5000
CMD ["python3", "/app/app.py"]
