"""
Vulnerable Flask application for XploitVerse Web-Basic CTF challenge.

Vulnerabilities:
  1. Command injection via the /ping endpoint
  2. Directory traversal via the /read endpoint

Students must exploit one of these to read /opt/flag.txt
"""
import os
import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return """
    <h1>XploitVerse Web Lab</h1>
    <p>Welcome to the vulnerable web application.</p>
    <h2>Available endpoints:</h2>
    <ul>
        <li>GET /ping?host=&lt;hostname&gt; - Ping a host</li>
        <li>GET /read?file=&lt;filename&gt; - Read a text file from /opt/webapp/files/</li>
        <li>GET /health - Health check</li>
    </ul>
    <p><em>Hint: Can you read /opt/flag.txt?</em></p>
    """


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/ping")
def ping():
    """
    VULNERABILITY: Command injection.
    The 'host' parameter is passed directly to the shell.
    Example exploit: /ping?host=127.0.0.1;cat /opt/flag.txt
    """
    host = request.args.get("host", "")
    if not host:
        return jsonify({"error": "host parameter required"}), 400

    # Intentionally vulnerable: shell=True with user input
    try:
        result = subprocess.check_output(
            f"ping -c 1 {host}",
            shell=True,
            stderr=subprocess.STDOUT,
            timeout=5,
        )
        return f"<pre>{result.decode()}</pre>"
    except subprocess.TimeoutExpired:
        return jsonify({"error": "ping timed out"}), 504
    except subprocess.CalledProcessError as e:
        return f"<pre>{e.output.decode()}</pre>", 500


@app.route("/read")
def read_file():
    """
    VULNERABILITY: Directory traversal.
    The 'file' parameter is not sanitized, allowing path traversal.
    Example exploit: /read?file=../../../opt/flag.txt
    """
    filename = request.args.get("file", "")
    if not filename:
        return jsonify({"error": "file parameter required"}), 400

    # Intentionally vulnerable: no path sanitization
    filepath = os.path.join("/opt/webapp/files", filename)
    try:
        with open(filepath, "r") as f:
            return f"<pre>{f.read()}</pre>"
    except FileNotFoundError:
        return jsonify({"error": "file not found"}), 404
    except PermissionError:
        return jsonify({"error": "permission denied"}), 403


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
