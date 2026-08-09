#!/bin/bash
set -e

# Start SSH daemon
service ssh start

# Start the vulnerable Flask app as hacker user in the background
su -c "cd /opt/webapp && python3 app.py" hacker &

# Keep container alive
exec sleep infinity
