"""
AWS Autopsy — Vulnerable Web Application (Capital One SSRF Simulation)

A Flask web application intentionally vulnerable to Server-Side Request Forgery (SSRF).
Simulates a misconfigured WAF/proxy that allows an attacker to query internal services,
including the EC2 Instance Metadata Service.

Based on the real 2019 Capital One breach (Case #01 from AWS-Autopsy by ridamdarji25).
"""

import os
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

# ── HTML Templates ──────────────────────────────────────────────────────────

HOME_HTML = """
<!DOCTYPE html>
<html>
<head><title>CapitalOne Internal Portal</title>
<style>
  body { font-family: Arial, sans-serif; background: #0a1628; color: #e0e0e0; margin: 0; padding: 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { color: #00d4aa; }
  .card { background: #162033; border: 1px solid #1e3a5f; border-radius: 8px; padding: 20px; margin: 15px 0; }
  .endpoint { color: #4ecdc4; font-family: monospace; }
  .warning { color: #ff6b6b; font-size: 0.85em; }
  a { color: #4ecdc4; }
  code { background: #1e3a5f; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
</style>
</head>
<body>
<div class="container">
  <h1>&#x1F3E6; CapitalOne Internal Portal</h1>
  <p>Web Application Firewall Management Console v3.1.4</p>

  <div class="card">
    <h3>Available Endpoints</h3>
    <ul>
      <li><span class="endpoint">GET /</span> — This page</li>
      <li><span class="endpoint">GET /status</span> — Server status &amp; diagnostics</li>
      <li><span class="endpoint">GET /fetch?url=&lt;url&gt;</span> — URL health checker (internal use)</li>
      <li><span class="endpoint">GET /docs</span> — API documentation</li>
    </ul>
  </div>

  <div class="card">
    <h3>&#x1F527; URL Health Checker</h3>
    <p>Internal tool for checking endpoint availability.</p>
    <p>Example: <code>GET /fetch?url=http://example.com</code></p>
    <p class="warning">&#x26A0; This endpoint should be restricted to internal networks only.</p>
  </div>

  <!-- DEBUG: metadata endpoint at 169.254.169.254 still accessible from app tier -->
  <!-- TODO: Migrate to IMDSv2 before next security audit -->
  <!-- NOTE: WAF role has S3 read access for config sync - ticket SEC-4821 -->
</div>
</body>
</html>
"""

STATUS_HTML = """
<!DOCTYPE html>
<html>
<head><title>Server Status</title>
<style>
  body { font-family: monospace; background: #0a1628; color: #00ff88; margin: 0; padding: 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  table { width: 100%%; border-collapse: collapse; }
  td { padding: 8px; border-bottom: 1px solid #1e3a5f; }
  td:first-child { color: #4ecdc4; width: 200px; }
  .hint { color: #666; font-size: 0.8em; margin-top: 20px; }
</style>
</head>
<body>
<div class="container">
  <h2>[SERVER STATUS]</h2>
  <table>
    <tr><td>hostname</td><td>ip-10-0-1-42.ec2.internal</td></tr>
    <tr><td>instance_type</td><td>t2.medium</td></tr>
    <tr><td>region</td><td>us-east-1</td></tr>
    <tr><td>vpc_id</td><td>vpc-0a1b2c3d4e5f</td></tr>
    <tr><td>subnet</td><td>subnet-private-1a</td></tr>
    <tr><td>iam_role</td><td>CapitalOne-WAF-Role</td></tr>
    <tr><td>imds_version</td><td>v1 (legacy)</td></tr>
    <tr><td>app_version</td><td>3.1.4</td></tr>
    <tr><td>python</td><td>3.10.12</td></tr>
    <tr><td>uptime</td><td>14d 6h 32m</td></tr>
  </table>
  <p class="hint">Tip: The metadata service is reachable at 169.254.169.254</p>
</div>
</body>
</html>
"""

DOCS_HTML = """
<!DOCTYPE html>
<html>
<head><title>API Docs</title>
<style>
  body { font-family: Arial, sans-serif; background: #0a1628; color: #e0e0e0; padding: 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { color: #00d4aa; }
  pre { background: #162033; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #1e3a5f; }
  code { color: #4ecdc4; }
  .note { background: #2d1810; border-left: 4px solid #ff6b6b; padding: 10px 15px; margin: 15px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>API Documentation</h1>

  <h2>GET /fetch</h2>
  <p>Server-side URL fetcher for internal health checks and content retrieval.</p>

  <h3>Parameters</h3>
  <pre><code>url (required) — The URL to fetch content from.

Examples:
  /fetch?url=http://example.com
  /fetch?url=http://10.0.1.100:8080/health
  /fetch?url=http://169.254.169.254/latest/meta-data/</code></pre>

  <div class="note">
    <strong>Security Notice:</strong> This endpoint performs server-side HTTP requests.
    Access should be restricted to authorized internal services only.
    No URL validation or allowlist is currently implemented (SEC-4820).
  </div>

  <h3>Response Format</h3>
  <pre><code>{
  "url": "requested url",
  "status_code": 200,
  "content": "response body",
  "content_length": 1234
}</code></pre>
</div>
</body>
</html>
"""


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(HOME_HTML)


@app.route("/status")
def status():
    return render_template_string(STATUS_HTML)


@app.route("/docs")
def docs():
    return render_template_string(DOCS_HTML)


@app.route("/fetch")
def fetch_url():
    """
    VULNERABLE ENDPOINT — Server-Side Request Forgery (SSRF)

    This endpoint fetches the content of any URL provided by the user,
    including internal/private network addresses like the EC2 metadata
    service at 169.254.169.254.

    No input validation, no URL allowlist, no SSRF protection.
    """
    url = request.args.get("url", "").strip()

    if not url:
        return jsonify({
            "error": "Missing 'url' parameter",
            "usage": "GET /fetch?url=http://example.com",
            "hint": "Try fetching internal endpoints..."
        }), 400

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "CapitalOne-WAF-HealthChecker/3.1.4"
        })
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode("utf-8", errors="replace")
            return jsonify({
                "url": url,
                "status_code": response.status,
                "content": content,
                "content_length": len(content)
            })
    except urllib.error.HTTPError as e:
        return jsonify({
            "url": url,
            "error": f"HTTP {e.code}: {e.reason}",
            "content": e.read().decode("utf-8", errors="replace") if e.fp else ""
        }), e.code
    except urllib.error.URLError as e:
        return jsonify({
            "url": url,
            "error": f"Connection failed: {str(e.reason)}"
        }), 502
    except Exception as e:
        return jsonify({
            "url": url,
            "error": f"Request failed: {str(e)}"
        }), 500


# ── Flag: SSRF Discovery ───────────────────────────────────────────────────
# When a user successfully fetches an internal URL (metadata), they've found
# the SSRF. The discovery flag is placed in a file for verification.

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
