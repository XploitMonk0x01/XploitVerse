FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip netcat-openbsd socat nmap \
    curl wget nano less \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask==3.1.0

RUN mkdir /run/sshd

# Create target user
RUN useradd -m -s /bin/bash target && echo "target:password123" | chpasswd && \
    useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd

# ---------- Stage 1: Web app with command injection to get reverse shell ----------
COPY webapp.py /opt/webapp/app.py
RUN echo "FLAG{xv_shell_initial_foothold}" > /opt/webapp/flag1.txt && \
    chown target:target /opt/webapp/flag1.txt && chmod 400 /opt/webapp/flag1.txt

# ---------- Stage 2: Lateral movement via SSH keys ----------
RUN mkdir -p /home/target/.ssh && \
    ssh-keygen -t rsa -N "" -f /home/target/.ssh/id_rsa && \
    cp /home/target/.ssh/id_rsa.pub /home/target/.ssh/authorized_keys && \
    echo "FLAG{xv_shell_lateral_movement}" > /home/target/flag2.txt && \
    chown -R target:target /home/target/.ssh /home/target/flag2.txt && \
    chmod 600 /home/target/.ssh/id_rsa

# ---------- Stage 3: Persistence via cron ----------
RUN echo "FLAG{xv_shell_persistence_achieved}" > /root/flag3.txt && \
    chmod 600 /root/flag3.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22 5000
USER hacker
WORKDIR /home/hacker
ENTRYPOINT ["/entrypoint.sh"]
