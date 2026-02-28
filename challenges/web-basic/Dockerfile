FROM ubuntu:22.04

LABEL xploitverse=lab
LABEL xploitverse.challenge="web-basic"
LABEL xploitverse.difficulty="easy"

# Avoid interactive prompts during install
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    net-tools \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Install a minimal web server
RUN pip3 install flask

# Create a non-root lab user
RUN useradd -m -s /bin/bash hacker

# Set up the vulnerable web application
WORKDIR /opt/webapp

COPY app.py /opt/webapp/app.py
COPY flag.txt /opt/flag.txt

# Flag is readable by root only (challenge: find the vuln to read it)
RUN chmod 600 /opt/flag.txt && chown root:root /opt/flag.txt

# The web app runs as the hacker user
RUN chown -R hacker:hacker /opt/webapp

# Expose the web server port
EXPOSE 5000

# Start a shell by default (the WS terminal will connect here)
CMD ["sleep", "infinity"]
