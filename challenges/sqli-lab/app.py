"""SQL Injection vulnerable web application for XploitVerse training."""

import sqlite3
import os
from flask import Flask, request, render_template_string, g

app = Flask(__name__)
DATABASE = "/app/data/shop.db"

LAYOUT = """
<!DOCTYPE html>
<html>
<head><title>VulnShop</title>
<style>
body { font-family: monospace; background: #111; color: #0f0; padding: 20px; }
input, button { background: #222; color: #0f0; border: 1px solid #0f0; padding: 8px; margin: 4px; }
table { border-collapse: collapse; margin-top: 10px; }
td, th { border: 1px solid #333; padding: 8px; text-align: left; }
a { color: #0ff; }
.error { color: #f00; }
h1 { color: #0f0; }
</style>
</head>
<body>
<h1>🛒 VulnShop</h1>
<nav>
  <a href="/">Home</a> |
  <a href="/products">Products</a> |
  <a href="/login">Login</a> |
  <a href="/search">Search</a>
</nav>
<hr>
%s
</body>
</html>
"""


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


@app.route("/")
def index():
    body = """
    <h2>Welcome to VulnShop</h2>
    <p>A deliberately vulnerable e-commerce demo.</p>
    <p>Try browsing <a href="/products">products</a>, <a href="/login">logging in</a>,
    or <a href="/search">searching</a> for items.</p>
    """
    return LAYOUT % body


# ---------- VULN 1: Union-based SQLi on product listing ----------
@app.route("/products")
def products():
    category = request.args.get("category", "")
    db = get_db()
    if category:
        # VULNERABLE: direct string interpolation
        query = f"SELECT id, name, price, category FROM products WHERE category = '{category}'"
    else:
        query = "SELECT id, name, price, category FROM products"
    try:
        rows = db.execute(query).fetchall()
        table = "<table><tr><th>ID</th><th>Name</th><th>Price</th><th>Category</th></tr>"
        for r in rows:
            table += f"<tr><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>"
        table += "</table>"

        body = f"""
        <h2>Products</h2>
        <form method="GET">
            Filter by category: <input name="category" value="{category}">
            <button type="submit">Filter</button>
        </form>
        <p><em>Hint: Categories are electronics, clothing, books</em></p>
        {table}
        <p><small>Query: <code>{query}</code></small></p>
        """
    except Exception as e:
        body = f'<p class="error">Error: {e}</p><p>Query was: <code>{query}</code></p>'
    return LAYOUT % body


# ---------- VULN 2: Authentication bypass via SQLi ----------
@app.route("/login", methods=["GET", "POST"])
def login():
    message = ""
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        db = get_db()
        # VULNERABLE: string interpolation in auth query
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        try:
            user = db.execute(query).fetchone()
            if user:
                role = user["role"] if "role" in user.keys() else "user"
                if role == "admin":
                    message = f'<p style="color:#0f0">✅ Welcome admin! Here is your flag: FLAG{{xv_sqli_auth_bypass}}</p>'
                else:
                    message = f'<p style="color:#0f0">✅ Logged in as: {user["username"]} (role: {role})</p>'
            else:
                message = '<p class="error">❌ Invalid credentials</p>'
            message += f'<p><small>Query: <code>{query}</code></small></p>'
        except Exception as e:
            message = f'<p class="error">Error: {e}</p>'
    body = f"""
    <h2>Login</h2>
    {message}
    <form method="POST">
        Username: <input name="username"><br>
        Password: <input name="password" type="password"><br>
        <button type="submit">Login</button>
    </form>
    """
    return LAYOUT % body


# ---------- VULN 3: Blind boolean-based SQLi on search ----------
@app.route("/search")
def search():
    q = request.args.get("q", "")
    db = get_db()
    results = ""
    if q:
        # VULNERABLE: string interpolation
        query = f"SELECT id, name, price FROM products WHERE name LIKE '%{q}%'"
        try:
            rows = db.execute(query).fetchall()
            if rows:
                results = "<table><tr><th>ID</th><th>Name</th><th>Price</th></tr>"
                for r in rows:
                    results += f"<tr><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>"
                results += "</table>"
            else:
                results = "<p>No products found.</p>"
            results += f'<p><small>Query: <code>{query}</code></small></p>'
        except Exception as e:
            results = f'<p class="error">Error: {e}</p>'
    body = f"""
    <h2>Search Products</h2>
    <form method="GET">
        <input name="q" value="{q}" placeholder="Search...">
        <button type="submit">Search</button>
    </form>
    {results}
    """
    return LAYOUT % body


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
