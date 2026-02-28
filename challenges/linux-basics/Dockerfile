FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash coreutils findutils grep sed gawk \
    less file tree nano vim \
    net-tools iputils-ping curl wget \
    passwd sudo cron \
    && rm -rf /var/lib/apt/lists/*

# ---------- Flag 1: Hidden file in home directory ----------
RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd
RUN echo "FLAG{xv_linux_hidden_file_found}" > /home/hacker/.secret_flag.txt && \
    chown hacker:hacker /home/hacker/.secret_flag.txt && \
    chmod 400 /home/hacker/.secret_flag.txt

# ---------- Flag 2: Inside a nested directory structure ----------
RUN mkdir -p /opt/projects/archive/2023/backup/old/logs && \
    echo "FLAG{xv_linux_deep_directory_navigation}" > /opt/projects/archive/2023/backup/old/logs/.flag.txt && \
    chmod 444 /opt/projects/archive/2023/backup/old/logs/.flag.txt

# ---------- Flag 3: Encoded in base64 in /etc ----------
RUN echo "RkxBR3t4dl9saW51eF9iYXNlNjRfZGVjb2Rpbmd9" > /etc/encoded_message.txt

# ---------- Flag 4: In a world-readable but obscure system file ----------
RUN echo "# System configuration - do not modify" > /var/lib/misc/system.conf && \
    echo "# FLAG{xv_linux_grep_master}" >> /var/lib/misc/system.conf && \
    echo "max_connections=100" >> /var/lib/misc/system.conf

# ---------- Flag 5: Only readable by root (requires privilege awareness) ----------
RUN echo "FLAG{xv_linux_file_permissions}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

# ---------- Flag 6: In a process / environment variable ----------
RUN echo 'export SECRET_FLAG="FLAG{xv_linux_env_variable}"' >> /etc/profile.d/challenge.sh

# ---------- Flag 7: Compressed in a tar.gz ----------
RUN mkdir -p /tmp/challenge && \
    echo "FLAG{xv_linux_archive_extraction}" > /tmp/challenge/readme.txt && \
    cd /tmp && tar czf /home/hacker/mystery.tar.gz challenge && \
    rm -rf /tmp/challenge

# ---------- Decoy files to make it interesting ----------
RUN for i in 1 2 3 4 5; do \
      mkdir -p /opt/data/folder$i && \
      echo "Nothing here, keep looking..." > /opt/data/folder$i/readme.txt; \
    done

# ---------- Add some realistic log files ----------
RUN mkdir -p /var/log/app && \
    echo "[2024-01-15 10:32:01] INFO  Server started on port 8080" > /var/log/app/server.log && \
    echo "[2024-01-15 10:32:15] WARN  Connection timeout from 192.168.1.50" >> /var/log/app/server.log && \
    echo "[2024-01-15 10:33:22] ERROR Failed login attempt user=admin ip=10.0.0.5" >> /var/log/app/server.log && \
    echo "[2024-01-15 10:34:01] INFO  Backup completed successfully" >> /var/log/app/server.log

USER hacker
WORKDIR /home/hacker
CMD ["sleep", "infinity"]
