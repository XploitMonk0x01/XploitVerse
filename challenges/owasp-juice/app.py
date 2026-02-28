"""OWASP Top 10 vulnerable web application for XploitVerse training."""

import os
import json
import urllib.request
from flask import Flask, request, render_template_string, redirect, session

app = Flask(__name__)
app.secret_key = "insecure-secret-key-do-not-use"

# In-memory data stores
USERS = {
    1: {"username": "admin", "email": "admin@vulnapp.local", "role": "admin", "notes": "FLAG{xv_owasp_idor_admin_access}"},
    2: {"username": "alice", "email": "alice@vulnapp.local", "role": "user", "notes": "Nothing interesting here."},
    3: {"username": "bob", "email": "bob@vulnapp.local", "role": "user", "notes": "Just a regular user."},
}

GUESTBOOK = []

STYLE = """
body { font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 20px; max-width: 800px; margin: 0 auto; }
input, textarea, button { background: #1a1a1a; color: #0f0; border: 1px solid #333; padding: 8px; margin: 4px 0; }
button { cursor: pointer; }
a { color: #0ff; }
.card { border: 1px solid #333; padding: 15px; margin: 10px 0; border-radius: 4px; }
.error { color: #f44; }
.success { color: #4f4; }
nav { margin-bottom: 20px; }
nav a { margin-right: 15px; }
code { background: #1a1a1a; padding: 2px 6px; }
h1 { color: #f80; }
"""


@app.route("/")
def index():
    return render_template_string("""
    <html><head><title>VulnApp</title><style>""" + STYLE + """</style></head><body>
    <h1>🔓 VulnApp — OWASP Training</h1>
    <nav>
        <a href="/">Home</a>
        <a href="/search">Search (XSS)</a>
        <a href="/guestbook">Guestbook (Stored XSS)</a>
        <a href="/profile/2">My Profile (IDOR)</a>
        <a href="/fetch">URL Fetch (SSRF)</a>
        <a href="/read">Read File (Path Traversal)</a>
    </nav>
    <div class="card">
        <h2>Welcome</h2>
        <p>This app contains intentional OWASP Top 10 vulnerabilities for training.</p>
        <p>Find the flags hidden across different vulnerability types!</p>
    </div>
    </body></html>
    """)


# ---------- VULN 1: Reflected XSS ----------
@app.route("/search")
def search():
    q = request.args.get("q", "")
    # VULNERABLE: unescaped user input reflected in HTML
    return render_template_string("""
    <html><head><title>Search</title><style>""" + STYLE + """</style></head><body>
    <h1>🔍 Search</h1>
    <nav><a href="/">Home</a></nav>
    <form method="GET">
        <input name="q" value="" placeholder="Search...">
        <button type="submit">Search</button>
    </form>
    {% if query %}
    <div class="card">
        <p>Results for: """ + q + """</p>
        <p>No results found.</p>
        <p><em>Hint: Can you make this page show an alert?</em></p>
        <p><em>Flag format: FLAG{xv_owasp_reflected_xss}</em></p>
    </div>
    {% endif %}
    </body></html>
    """, query=q)


# ---------- VULN 2: Stored XSS via guestbook ----------
@app.route("/guestbook", methods=["GET", "POST"])
def guestbook():
    if request.method == "POST":
        name = request.form.get("name", "Anonymous")
        message = request.form.get("message", "")
        if message:
            GUESTBOOK.append({"name": name, "message": message})

    entries = ""
    for entry in GUESTBOOK:
        # VULNERABLE: unescaped output
        entries += f'<div class="card"><strong>{entry["name"]}</strong>: {entry["message"]}</div>'

    return f"""
    <html><head><title>Guestbook</title><style>{STYLE}</style></head><body>
    <h1>📝 Guestbook</h1>
    <nav><a href="/">Home</a></nav>
    <form method="POST">
        Name: <input name="name" value="Anonymous"><br>
        Message: <textarea name="message" rows="3" cols="40"></textarea><br>
        <button type="submit">Post</button>
    </form>
    <hr>
    {entries}
    <p><em>Hint: Try posting a message with HTML or JavaScript</em></p>
    <p><em>Flag: FLAG{{xv_owasp_stored_xss}}</em> — claim it when you successfully inject a script</p>
    </body></html>
    """


# ---------- VULN 3: IDOR on user profiles ----------
@app.route("/profile/<int:user_id>")
def profile(user_id):
    # VULNERABLE: no authorization check — any user can view any profile
    user = USERS.get(user_id)
    if not user:
        return f"""
        <html><head><style>{STYLE}</style></head><body>
        <h1>Profile</h1><nav><a href="/">Home</a></nav>
        <p class="error">User not found.</p>
        <p><em>Try IDs 1, 2, or 3</em></p>
        </body></html>
        """
    return f"""
    <html><head><title>Profile</title><style>{STYLE}</style></head><body>
    <h1>👤 Profile</h1>
    <nav><a href="/">Home</a></nav>
    <div class="card">
        <p><strong>Username:</strong> {user['username']}</p>
        <p><strong>Email:</strong> {user['email']}</p>
        <p><strong>Role:</strong> {user['role']}</p>
        <p><strong>Notes:</strong> {user['notes']}</p>
    </div>
    <p><em>Hint: You're viewing profile #{user_id}. What about other IDs?</em></p>
    </body></html>
    """


# ---------- VULN 4: SSRF via URL fetcher ----------
@app.route("/fetch", methods=["GET", "POST"])
def fetch_url():
    result = ""
    if request.method == "POST":
        url = request.form.get("url", "")
        if url:
            try:
                # VULNERABLE: fetches arbitrary URLs including internal resources
                resp = urllib.request.urlopen(url, timeout=5)
                content = resp.read().decode("utf-8", errors="replace")[:2000]
                result = f'<div class="card"><h3>Response:</h3><pre>{content}</pre></div>'
            except Exception as e:
                result = f'<p class="error">Error: {e}</p>'
    return f"""
    <html><head><title>URL Fetch</title><style>{STYLE}</style></head><body>
    <h1>🌐 URL Fetcher</h1>
    <nav><a href="/">Home</a></nav>
    <form method="POST">
        URL: <input name="url" value="" placeholder="https://example.com" style="width:400px"><br>
        <button type="submit">Fetch</button>
    </form>
    {result}
    <p><em>Hint: Can you make the server read local files? Try file:// protocol</em></p>
    </body></html>
    """


# ---------- VULN 5: Path traversal ----------
@app.route("/read")
def read_file():
    filename = request.args.get("file", "welcome.txt")
    content = ""
    try:
        # VULNERABLE: no path sanitization
        filepath = os.path.join("/app/docs", filename)
        with open(filepath, "r") as f:
            content = f.read()
    except Exception as e:
        content = f"Error: {e}"

    return f"""
    <html><head><title>Read File</title><style>{STYLE}</style></head><body>
    <h1>📄 Document Reader</h1>
    <nav><a href="/">Home</a></nav>
    <form method="GET">
        Filename: <input name="file" value="{filename}">
        <button type="submit">Read</button>
    </form>
    <div class="card"><pre>{content}</pre></div>
    <p><em>Available docs: welcome.txt, about.txt</em></p>
    <p><em>Hint: What if you escape the /app/docs directory?</em></p>
    </body></html>
    """


# Internal admin endpoint (for SSRF target)
@app.route("/internal/admin")
def internal_admin():
    # Only accessible via SSRF (not exposed externally in real scenario)
    return "FLAG{xv_owasp_ssrf_internal_access}\nInternal admin panel — you shouldn't be here!"


# Set up static docs
os.makedirs("/app/docs", exist_ok=True)
with open("/app/docs/welcome.txt", "w") as f:
    f.write("Welcome to VulnApp!\nThis is a training application for OWASP Top 10 vulnerabilities.\n")
with open("/app/docs/about.txt", "w") as f:
    f.write("VulnApp v1.0\nPart of the XploitVerse cybersecurity training platform.\n")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
