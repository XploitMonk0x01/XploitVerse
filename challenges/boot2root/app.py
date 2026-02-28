"""Boot2Root web API — vulnerable to SQL injection."""

import sqlite3
import os
from flask import Flask, request, jsonify, g

app = Flask(__name__)
DB_PATH = "/opt/webapp/data/app.db"


def get_db():
    db = getattr(g, "_db", None)
    if db is None:
        db = g._db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_db", None)
    if db:
        db.close()


@app.route("/")
def index():
    return jsonify({"app": "TargetCorp API", "version": "3.2.1", "endpoints": ["/api/employees", "/api/login"]})


@app.route("/api/employees")
def employees():
    dept = request.args.get("dept", "")
    db = get_db()
    if dept:
        # VULNERABLE
        query = f"SELECT id, name, department, email FROM employees WHERE department = '{dept}'"
    else:
        query = "SELECT id, name, department, email FROM employees"
    try:
        rows = db.execute(query).fetchall()
        return jsonify({"employees": [dict(r) for r in rows], "query": query})
    except Exception as e:
        return jsonify({"error": str(e), "query": query}), 500


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")
    db = get_db()
    # VULNERABLE
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    try:
        user = db.execute(query).fetchone()
        if user:
            return jsonify({"success": True, "user": dict(user), "message": "Login successful"})
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
