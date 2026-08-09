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
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Install a minimal web server
RUN pip3 install flask

# Configure SSH
RUN mkdir -p /var/run/sshd \
    && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/UsePAM yes/UsePAM no/' /etc/ssh/sshd_config

# Create SSH-accessible 'student' user with password 'student'
RUN useradd -m -s /bin/bash student \
    && echo "student:student" | chpasswd

# Create a non-root lab 'hacker' user for running the app
RUN useradd -m -s /bin/bash hacker

# Set up the vulnerable web application
WORKDIR /opt/webapp

COPY app.py /opt/webapp/app.py
COPY flag.txt /opt/flag.txt

# Flag is readable by root only (challenge: find the vuln to read it)
RUN chmod 600 /opt/flag.txt && chown root:root /opt/flag.txt

# The web app runs as the hacker user
RUN chown -R hacker:hacker /opt/webapp

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose SSH and web server ports
EXPOSE 22 5000

CMD ["/entrypoint.sh"]
