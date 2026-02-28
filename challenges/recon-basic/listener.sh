#!/bin/bash
# Hidden service that listens on port 31337 and returns the flag
while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n$(cat /opt/services/.hidden_flag)" | nc -l -p 31337 -q 1 2>/dev/null || true
    sleep 0.5
done
