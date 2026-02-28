#!/bin/bash
/usr/sbin/sshd 2>/dev/null
cd /opt/webapp && python3 app.py &
exec sleep infinity
