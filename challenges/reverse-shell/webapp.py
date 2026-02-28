"""Vulnerable web app for reverse shell practice."""

import os
import subprocess
from flask import Flask, request

app = Flask(__name__)

STYLE = """
body { font-family: monospace; background: #111; color: #0f0; padding: 20px; }
input, button { background: #222; color: #0f0; border: 1px solid #0f0; padding: 8px; }
pre { background: #0a0a0a; padding: 10px; border: 1px solid #333; overflow-x: auto; }
"""


@app.route("/")
def index():
    return f"""
    <html><head><style>{STYLE}</style></head><body>
    <h1>🖥️ Network Diagnostics Tool</h1>
    <p>Internal tool for checking host connectivity.</p>
    <form action="/ping" method="GET">
        Host: <input name="host" placeholder="127.0.0.1">
        <button type="submit">Ping</button>
    </form>
    <hr>
    <p><em>Hint: This is a command injection vulnerability. Can you get a shell?</em></p>
    </body></html>
    """


@app.route("/ping")
def ping():
    host = request.args.get("host", "127.0.0.1")
    try:
        # VULNERABLE: command injection
        result = subprocess.check_output(
            f"ping -c 2 {host}",
            shell=True, stderr=subprocess.STDOUT, timeout=10
        ).decode()
    except subprocess.CalledProcessError as e:
        result = e.output.decode()
    except subprocess.TimeoutExpired:
        result = "Timeout!"
    except Exception as e:
        result = str(e)

    return f"""
    <html><head><style>{STYLE}</style></head><body>
    <h1>🖥️ Ping Result</h1>
    <p>Target: {host}</p>
    <pre>{result}</pre>
    <a href="/">← Back</a>
    </body></html>
    """


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
