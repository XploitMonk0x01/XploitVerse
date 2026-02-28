FROM ubuntu:22.04

LABEL xploitverse=lab
LABEL xploitverse.challenge="recon-basic"
LABEL xploitverse.difficulty="easy"

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    curl \
    wget \
    dnsutils \
    whois \
    netcat-openbsd \
    iputils-ping \
    net-tools \
    traceroute \
    python3 \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Create lab user
RUN useradd -m -s /bin/bash hacker

# Place flag in a hidden service
RUN mkdir -p /opt/services && \
    echo "FLAG{xv_recon_service_discovery_2024}" > /opt/services/.hidden_flag && \
    chmod 644 /opt/services/.hidden_flag

# Set up a simple listener that serves the flag on a non-standard port
COPY listener.sh /opt/services/listener.sh
RUN chmod +x /opt/services/listener.sh

# Hint file
RUN echo "Network Reconnaissance Challenge" > /home/hacker/README.txt && \
    echo "================================" >> /home/hacker/README.txt && \
    echo "" >> /home/hacker/README.txt && \
    echo "A hidden service is running on this machine." >> /home/hacker/README.txt && \
    echo "Use your recon skills to find it and capture the flag." >> /home/hacker/README.txt && \
    echo "" >> /home/hacker/README.txt && \
    echo "Tools available: nmap, curl, netcat, dig, whois" >> /home/hacker/README.txt && \
    echo "" >> /home/hacker/README.txt && \
    echo "Hints:" >> /home/hacker/README.txt && \
    echo "  - Scan localhost for open ports" >> /home/hacker/README.txt && \
    echo "  - Try: nmap -sV -p- 127.0.0.1" >> /home/hacker/README.txt && \
    chown hacker:hacker /home/hacker/README.txt

# Start the hidden listener and keep container alive
CMD ["/bin/bash", "-c", "/opt/services/listener.sh & sleep infinity"]
