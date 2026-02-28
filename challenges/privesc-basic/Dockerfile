FROM ubuntu:22.04

LABEL xploitverse=lab
LABEL xploitverse.challenge="privesc-basic"
LABEL xploitverse.difficulty="medium"

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    curl \
    nano \
    vim \
    net-tools \
    python3 \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Create the lab user (students login as this user)
RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd

# Place the root flag
RUN echo "FLAG{xv_privesc_suid_escalation_2024}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

# ── Vulnerability 1: SUID binary ──────────────────────────
# A custom SUID binary that spawns a shell
COPY suid_helper.c /tmp/suid_helper.c
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    gcc -o /usr/local/bin/suid_helper /tmp/suid_helper.c && \
    chmod u+s /usr/local/bin/suid_helper && \
    rm /tmp/suid_helper.c && \
    apt-get remove -y gcc && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# ── Vulnerability 2: Writable cron job ────────────────────
# A cron job runs as root every minute, executing a script the user can edit
RUN echo "* * * * * root /opt/scripts/backup.sh" > /etc/cron.d/backup && \
    chmod 644 /etc/cron.d/backup

RUN mkdir -p /opt/scripts && \
    echo '#!/bin/bash\necho "backup done" >> /var/log/backup.log' > /opt/scripts/backup.sh && \
    chmod 777 /opt/scripts/backup.sh

# ── Vulnerability 3: sudo misconfiguration ────────────────
# The hacker user can run vim as root without password
RUN echo "hacker ALL=(root) NOPASSWD: /usr/bin/vim" >> /etc/sudoers

# Hint file for students
RUN echo "Welcome to the Privilege Escalation challenge!" > /home/hacker/README.txt && \
    echo "" >> /home/hacker/README.txt && \
    echo "Your goal: read /root/flag.txt" >> /home/hacker/README.txt && \
    echo "" >> /home/hacker/README.txt && \
    echo "Hints:" >> /home/hacker/README.txt && \
    echo "  - Look for SUID binaries: find / -perm -4000 2>/dev/null" >> /home/hacker/README.txt && \
    echo "  - Check sudo permissions: sudo -l" >> /home/hacker/README.txt && \
    echo "  - Look for writable cron jobs" >> /home/hacker/README.txt && \
    chown hacker:hacker /home/hacker/README.txt

# Start as the hacker user for terminal sessions
USER hacker
WORKDIR /home/hacker

CMD ["sleep", "infinity"]
