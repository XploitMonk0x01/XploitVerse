FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip curl nano less net-tools \
    openssh-server cron sudo \
    gcc make \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask==3.1.0

# ---------- System setup ----------
RUN mkdir /run/sshd

# Create users with different privilege levels
RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd && \
    useradd -m -s /bin/bash webadmin && echo "webadmin:webadmin" | chpasswd && \
    useradd -m -s /bin/bash dbadmin && echo "dbadmin:changeme" | chpasswd

# ---------- Vector 1: SUID binary ----------
COPY suid_shell.c /tmp/suid_shell.c
RUN gcc -o /usr/local/bin/statuscheck /tmp/suid_shell.c && \
    chmod u+s /usr/local/bin/statuscheck && \
    rm /tmp/suid_shell.c

# ---------- Vector 2: Writable cron job running as root ----------
RUN echo "#!/bin/bash\ntar czf /backup/system.tar.gz /var/log 2>/dev/null" > /opt/backup.sh && \
    chmod 777 /opt/backup.sh && \
    echo "* * * * * root /opt/backup.sh" > /etc/cron.d/backup && \
    mkdir -p /backup

# ---------- Vector 3: sudo misconfiguration ----------
RUN echo "webadmin ALL=(ALL) NOPASSWD: /usr/bin/find" >> /etc/sudoers && \
    echo "dbadmin ALL=(ALL) NOPASSWD: /usr/bin/vim" >> /etc/sudoers

# ---------- Vector 4: Writable /etc/passwd ----------
RUN chmod 646 /etc/passwd

# ---------- Vector 5: Kernel exploit simulation (readable shadow) ----------
RUN chmod 644 /etc/shadow

# ---------- Vector 6: Docker socket simulation ----------
RUN echo "FLAG{xv_privesc_docker_group_escape}" > /root/.docker_flag.txt

# ---------- Vector 7: Weak file permissions on SSH key ----------
RUN ssh-keygen -t rsa -N "" -f /root/.ssh/id_rsa && \
    cp /root/.ssh/id_rsa /opt/.backup_key && \
    chmod 644 /opt/.backup_key

# ---------- Vector 8: Password in config file ----------
RUN mkdir -p /opt/webapp && \
    echo "DB_HOST=localhost\nDB_USER=root\nDB_PASS=FLAG{xv_privesc_config_leak}\nDB_NAME=production" > /opt/webapp/.env && \
    chmod 644 /opt/webapp/.env

# ---------- Flags ----------
RUN echo "FLAG{xv_privesc_root_owned}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

RUN echo "FLAG{xv_privesc_suid_escalation}" > /root/proof.txt && \
    chmod 600 /root/proof.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER hacker
WORKDIR /home/hacker
ENTRYPOINT ["/entrypoint.sh"]
