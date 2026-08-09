#!/bin/bash
# AWS Autopsy — Container Entrypoint
# Starts all three services and configures networking for metadata simulation.

set -e

echo "========================================"
echo "  AWS Autopsy: Capital One SSRF Lab"
echo "  XploitVerse Challenge Environment"
echo "========================================"
echo ""

# ── Start metadata service (port 8000) ──────────────────────────────────
echo "[*] Starting mock EC2 metadata service on :8000..."
python3 /opt/metadata/metadata_service.py &
METADATA_PID=$!
sleep 1

# ── Redirect 169.254.169.254 → localhost:8000 ──────────────────────────
# This simulates the real EC2 metadata endpoint being available at
# the link-local address. We add the IP to loopback and use iptables
# to redirect traffic. Requires --cap-add=NET_ADMIN on docker run.
echo "[*] Configuring metadata IP redirect (169.254.169.254 → :8000)..."
if command -v ip &>/dev/null; then
    ip addr add 169.254.169.254/32 dev lo 2>/dev/null || true
    iptables -t nat -A OUTPUT -d 169.254.169.254 -p tcp --dport 80 \
        -j REDIRECT --to-port 8000 2>/dev/null || {
        echo "[!] iptables redirect failed — metadata available at localhost:8000 only"
        echo "[!] Hint: Run container with --cap-add=NET_ADMIN for full simulation"
    }
else
    echo "[!] 'ip' command not found — metadata available at localhost:8000"
fi

# ── Start S3 mock service (port 9000) ───────────────────────────────────
echo "[*] Starting mock S3 service on :9000..."
python3 /opt/s3service/s3_service.py &
S3_PID=$!
sleep 1

# ── Start vulnerable web app (port 5000) ────────────────────────────────
echo "[*] Starting vulnerable web application on :5000..."
echo ""
echo "========================================"
echo "  Lab is ready!"
echo ""
echo "  Web App:   http://localhost:5000"
echo "  Metadata:  http://localhost:8000 (or 169.254.169.254)"
echo "  S3 Mock:   http://localhost:9000"
echo ""
echo "  Your mission: Exploit the SSRF vulnerability"
echo "  to steal IAM credentials and exfiltrate data."
echo ""
echo "  Good luck, hacker!"
echo "========================================"
echo ""

# Run webapp in foreground (so container stays alive)
exec python3 /opt/webapp/webapp.py
