FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ── System packages ─────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    curl wget nano less jq \
    net-tools nmap netcat-openbsd dnsutils \
    iproute2 iptables \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ────────────────────────────────────────────────
RUN pip3 install --no-cache-dir flask==3.1.0

# ── Directory structure ────────────────────────────────────────────────
RUN mkdir -p /opt/webapp /opt/metadata /opt/s3service /opt/s3data

# ── Copy application files ─────────────────────────────────────────────
COPY webapp.py /opt/webapp/webapp.py
COPY metadata_service.py /opt/metadata/metadata_service.py
COPY s3_service.py /opt/s3service/s3_service.py
COPY setup_data.py /opt/s3data/setup_data.py

# ── Seed fake S3 data ──────────────────────────────────────────────────
RUN python3 /opt/s3data/setup_data.py

# ── Place flags at each attack stage ───────────────────────────────────

# Flag 1: SSRF Discovery — hidden in the web app directory
RUN echo "FLAG{xv_aws_autopsy_ssrf_discovered}" > /opt/webapp/.flag_ssrf.txt && \
    chmod 644 /opt/webapp/.flag_ssrf.txt

# Flag 2: Metadata Leak — hidden in the metadata service directory
RUN echo "FLAG{xv_aws_autopsy_metadata_leaked}" > /opt/metadata/.flag_metadata.txt && \
    chmod 644 /opt/metadata/.flag_metadata.txt

# Flag 3: Credential Theft — already placed by setup_data.py at /opt/s3data/.flag_creds.txt

# Flag 4: Data Exfiltration — already placed by setup_data.py at /opt/s3data/capitalone-sensitive/.flag_exfil.txt

# Flag 5: Root — only accessible after privilege escalation
RUN echo "FLAG{xv_aws_autopsy_root_pwned}" > /root/root.txt && \
    chmod 600 /root/root.txt

# ── Create lab user with limited privileges ────────────────────────────
RUN useradd -m -s /bin/bash attacker && \
    echo "attacker:xploitverse" | chpasswd && \
    # Give attacker sudo access to python3 only (for privesc challenge)
    echo "attacker ALL=(ALL) NOPASSWD: /usr/bin/python3" >> /etc/sudoers

# ── Hints and breadcrumbs ──────────────────────────────────────────────
RUN echo "Welcome to the AWS Autopsy Lab!" > /home/attacker/README.txt && \
    echo "" >> /home/attacker/README.txt && \
    echo "Your mission: Recreate the 2019 Capital One data breach." >> /home/attacker/README.txt && \
    echo "" >> /home/attacker/README.txt && \
    echo "Attack Chain:" >> /home/attacker/README.txt && \
    echo "  1. Find the SSRF vulnerability in the web app (port 5000)" >> /home/attacker/README.txt && \
    echo "  2. Use SSRF to access the EC2 metadata service" >> /home/attacker/README.txt && \
    echo "  3. Steal IAM credentials from the metadata" >> /home/attacker/README.txt && \
    echo "  4. Use stolen creds to access S3 data (port 9000)" >> /home/attacker/README.txt && \
    echo "  5. Exfiltrate sensitive customer data" >> /home/attacker/README.txt && \
    echo "" >> /home/attacker/README.txt && \
    echo "Hints:" >> /home/attacker/README.txt && \
    echo "  - Start by exploring the web app at http://localhost:5000" >> /home/attacker/README.txt && \
    echo "  - Check /status and /docs endpoints" >> /home/attacker/README.txt && \
    echo "  - The metadata service lives at 169.254.169.254" >> /home/attacker/README.txt && \
    echo "  - Flags are hidden at each stage — find all 5!" >> /home/attacker/README.txt && \
    chown attacker:attacker /home/attacker/README.txt

# ── Entrypoint ──────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000 8000 9000

# Start as root for iptables, services drop to attacker context as needed
ENTRYPOINT ["/entrypoint.sh"]
