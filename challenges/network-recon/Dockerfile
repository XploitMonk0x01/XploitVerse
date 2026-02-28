FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap netcat-openbsd curl wget dnsutils whois \
    traceroute iputils-ping net-tools iproute2 \
    python3 nikto dirb gobuster hydra \
    nano less file tree \
    openssh-server apache2 vsftpd \
    && rm -rf /var/lib/apt/lists/*

# ---------- Service 1: SSH on port 22 ----------
RUN mkdir /run/sshd && \
    echo "root:toor" | chpasswd && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

# ---------- Service 2: Apache on port 80 ----------
RUN echo "<html><body><h1>Welcome to Target Corp</h1><!-- Flag: FLAG{xv_recon_source_code_review} --></body></html>" \
    > /var/www/html/index.html && \
    mkdir -p /var/www/html/.hidden && \
    echo "FLAG{xv_recon_directory_busting}" > /var/www/html/.hidden/secret.txt && \
    mkdir -p /var/www/html/admin && \
    echo "<html><body><h1>Admin Panel</h1><p>FLAG{xv_recon_admin_panel_found}</p></body></html>" > /var/www/html/admin/index.html && \
    echo "User-agent: *" > /var/www/html/robots.txt && \
    echo "Disallow: /admin/" >> /var/www/html/robots.txt && \
    echo "Disallow: /.hidden/" >> /var/www/html/robots.txt

# ---------- Service 3: FTP on port 21 ----------
RUN useradd -m ftpuser && echo "ftpuser:ftppass123" | chpasswd && \
    mkdir -p /home/ftpuser/files && \
    echo "FLAG{xv_recon_ftp_anonymous_access}" > /home/ftpuser/files/credentials.txt && \
    echo "anonymous_enable=YES" >> /etc/vsftpd.conf && \
    echo "anon_root=/home/ftpuser" >> /etc/vsftpd.conf

# ---------- Service 4: Netcat listener on port 8888 ----------
RUN echo '#!/bin/bash\nwhile true; do echo "FLAG{xv_recon_banner_grabbing}" | nc -l -p 8888 -q 1; done' \
    > /opt/listener.sh && chmod +x /opt/listener.sh

# ---------- Service 5: Python HTTP on port 9090 (hidden API) ----------
RUN mkdir -p /opt/api && \
    echo '{"status":"ok","flag":"FLAG{xv_recon_hidden_api_endpoint}","version":"0.1.0-internal"}' > /opt/api/status.json

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Recon user
RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd

EXPOSE 21 22 80 8888 9090

ENTRYPOINT ["/entrypoint.sh"]
