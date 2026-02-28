"""Seed the SQLite database for the SQLi lab."""

import sqlite3
import os

DB_DIR = "/app/data"
DB_PATH = os.path.join(DB_DIR, "shop.db")

os.makedirs(DB_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
)
""")

c.execute("""
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    category TEXT
)
""")

# Secret table that users must discover via UNION injection
c.execute("""
CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY,
    flag TEXT,
    note TEXT
)
""")

# Users
users = [
    ("admin", "Sup3rS3cur3P@ss!", "admin"),
    ("alice", "password123", "user"),
    ("bob", "letmein", "user"),
    ("guest", "guest", "user"),
]
c.executemany("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)", users)

# Products
products = [
    ("Laptop Pro 15", 1299.99, "electronics"),
    ("Wireless Mouse", 29.99, "electronics"),
    ("USB-C Hub", 49.99, "electronics"),
    ("Mechanical Keyboard", 89.99, "electronics"),
    ("Python Crash Course", 39.99, "books"),
    ("The Web Application Hackers Handbook", 54.99, "books"),
    ("RTFM Red Team Field Manual", 14.99, "books"),
    ("Hacking Hoodie", 45.00, "clothing"),
    ("CTF Team T-Shirt", 25.00, "clothing"),
]
c.executemany("INSERT OR IGNORE INTO products (name, price, category) VALUES (?, ?, ?)", products)

# Hidden flag in secrets table
c.execute("INSERT OR IGNORE INTO secrets (id, flag, note) VALUES (1, 'FLAG{xv_sqli_union_data_exfil}', 'You found the hidden secrets table!')")

conn.commit()
conn.close()

print("Database seeded successfully!")
