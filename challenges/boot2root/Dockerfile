FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip sqlite3 \
    openssh-server cron sudo nano less curl \
    gcc make net-tools nmap netcat-openbsd \
    apache2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask==3.1.0

RUN mkdir /run/sshd

# ========== USERS ==========
RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd && \
    useradd -m -s /bin/bash webdev && echo "webdev:W3bD3v2024!" | chpasswd && \
    useradd -m -s /bin/bash sysadmin && echo "sysadmin:Adm1n#Root" | chpasswd && \
    echo "sysadmin ALL=(ALL) NOPASSWD: /usr/bin/python3" >> /etc/sudoers

# ========== STAGE 1: Web enumeration ==========
# Apache hosts a corporate site with hints
RUN echo '<html><body><h1>TargetCorp Internal</h1><p>Employee Portal v3.2</p><!-- TODO: remove /dev endpoint before prod --></body></html>' \
    > /var/www/html/index.html && \
    mkdir -p /var/www/html/dev && \
    echo '{"api":"http://localhost:5000","debug":true,"note":"Dev API running on port 5000"}' > /var/www/html/dev/config.json && \
    echo "User-agent: *\nDisallow: /dev/\nDisallow: /backup/" > /var/www/html/robots.txt && \
    mkdir -p /var/www/html/backup && \
    echo "webdev:W3bD3v2024!" > /var/www/html/backup/credentials.bak && \
    chmod 644 /var/www/html/backup/credentials.bak

# Flag 1 — enumeration
RUN echo "FLAG{xv_boot2root_web_enumeration}" > /var/www/html/dev/.flag.txt

# ========== STAGE 2: Flask API with SQLi ==========
COPY app.py /opt/webapp/app.py
COPY setup_db.py /opt/webapp/setup_db.py
RUN cd /opt/webapp && python3 setup_db.py

# Flag 2 — SQLi
# (inside the database, planted by setup_db.py)

# ========== STAGE 3: SSH as webdev → lateral move ==========
RUN echo "FLAG{xv_boot2root_ssh_foothold}" > /home/webdev/user.txt && \
    chown webdev:webdev /home/webdev/user.txt

# Hint file pointing to sysadmin
RUN echo "Note to self: sysadmin left their old password hash somewhere in /var/log" \
    > /home/webdev/notes.txt && \
    chown webdev:webdev /home/webdev/notes.txt

# Fake log with sysadmin password hash (crackable)
RUN echo "[2024-03-15] Auth attempt: user=sysadmin hash=\$1\$xyz\$Adm1n#Root" \
    > /var/log/auth_debug.log && chmod 644 /var/log/auth_debug.log

# ========== STAGE 4: Privesc via sudo python3 ==========
RUN echo "FLAG{xv_boot2root_privilege_escalation}" > /home/sysadmin/flag.txt && \
    chown sysadmin:sysadmin /home/sysadmin/flag.txt

# ========== STAGE 5: Root ==========
RUN echo "FLAG{xv_boot2root_root_pwned}" > /root/root.txt && \
    chmod 600 /root/root.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22 80 5000
USER hacker
WORKDIR /home/hacker
ENTRYPOINT ["/entrypoint.sh"]
