import sqlite3, os

DB_DIR = "/opt/webapp/data"
os.makedirs(DB_DIR, exist_ok=True)
conn = sqlite3.connect(os.path.join(DB_DIR, "app.db"))
c = conn.cursor()

c.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, email TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS secrets (id INTEGER PRIMARY KEY, flag TEXT, note TEXT)")

c.executemany("INSERT INTO users VALUES (?, ?, ?, ?)", [
    (1, "admin", "Sup3rAdm1n!", "admin"),
    (2, "webdev", "W3bD3v2024!", "developer"),
    (3, "guest", "guest", "guest"),
])
c.executemany("INSERT INTO employees VALUES (?, ?, ?, ?)", [
    (1, "John Smith", "Engineering", "john@targetcorp.local"),
    (2, "Jane Doe", "Marketing", "jane@targetcorp.local"),
    (3, "Bob Wilson", "Engineering", "bob@targetcorp.local"),
    (4, "Alice Chen", "Finance", "alice@targetcorp.local"),
])
c.execute("INSERT INTO secrets VALUES (1, 'FLAG{xv_boot2root_sqli_database_dump}', 'You dumped the secrets table!')")

conn.commit()
conn.close()
print("Boot2root DB seeded.")
