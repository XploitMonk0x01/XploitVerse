#!/bin/bash
# Start all services
/usr/sbin/sshd
service apache2 start
service vsftpd start

# Banner grabbing listener
/opt/listener.sh &

# Simple Python HTTP API on port 9090
cd /opt/api && python3 -m http.server 9090 &

# Keep container alive
exec sleep infinity
