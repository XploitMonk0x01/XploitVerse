#!/bin/bash
# Start cron for the backup job vector
service cron start 2>/dev/null

# Start SSH
/usr/sbin/sshd 2>/dev/null

exec sleep infinity
