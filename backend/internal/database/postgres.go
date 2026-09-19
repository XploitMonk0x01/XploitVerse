package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ConnectPostgres opens a PostgreSQL connection pool.
func ConnectPostgres(uri string) (*pgxpool.Pool, error) {
	if uri == "" {
		return nil, fmt.Errorf("POSTGRES_URI is required")
	}

	cfg, err := pgxpool.ParseConfig(uri)
	if err != nil {
		return nil, fmt.Errorf("invalid POSTGRES_URI: %w", err)
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	log.Println("✅ PostgreSQL connected")
	return pool, nil
}

// RunPostgresMigrations creates required tables and indexes for the Postgres-first backend.
func RunPostgresMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	ddl := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','INSTRUCTOR','ADMIN')),
			first_name TEXT NOT NULL DEFAULT '',
			last_name TEXT NOT NULL DEFAULT '',
			is_active BOOLEAN NOT NULL DEFAULT true,
			is_email_verified BOOLEAN NOT NULL DEFAULT false,
			last_login TIMESTAMPTZ,
			password_reset_token TEXT,
			password_reset_expires TIMESTAMPTZ,
			password_changed_at TIMESTAMPTZ,
			total_lab_time BIGINT NOT NULL DEFAULT 0,
			total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ`,
		`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uniq ON users (LOWER(email))`,
		`CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users (password_reset_token)`,

`CREATE TABLE IF NOT EXISTS assets (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			name TEXT NOT NULL,
			source_type TEXT NOT NULL DEFAULT 'custom',
			source_ref TEXT,
			docker_image TEXT NOT NULL,
			build_context_path TEXT,
			exposed_ports_json JSONB NOT NULL DEFAULT '[]'::jsonb,
			env_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			type TEXT NOT NULL DEFAULT 'target' CHECK (type IN ('target','attack')),
			is_active BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CHECK (jsonb_typeof(exposed_ports_json) = 'array'),
			CHECK (jsonb_typeof(env_json) = 'object')
		)`,
		`ALTER TABLE assets ADD COLUMN IF NOT EXISTS build_context_path TEXT`,

		`CREATE TABLE IF NOT EXISTS rooms (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			slug TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy','Medium','Hard')),
			is_public BOOLEAN NOT NULL DEFAULT true,
			created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,

		`CREATE TABLE IF NOT EXISTS modules (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			order_no BIGINT NOT NULL DEFAULT 1,
			points_reward BIGINT NOT NULL DEFAULT 0,
			is_published BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE (room_id, order_no)
		)`,
		`CREATE INDEX IF NOT EXISTS modules_room_id_idx ON modules (room_id)`,

		`CREATE TABLE IF NOT EXISTS tasks (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
			module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
			asset_id BIGINT REFERENCES assets(id) ON DELETE SET NULL,
			title TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'flag' CHECK (type IN ('flag','question','interactive')),
			flag_type TEXT NOT NULL DEFAULT 'string',
			body_markdown TEXT NOT NULL DEFAULT '',
			prompt TEXT NOT NULL DEFAULT '',
			hints_json JSONB NOT NULL DEFAULT '[]'::jsonb,
			order_no BIGINT NOT NULL DEFAULT 1,
			points BIGINT NOT NULL DEFAULT 0 CHECK (points >= 0),
			hint_penalty BIGINT NOT NULL DEFAULT 0 CHECK (hint_penalty >= 0),
			flag_hash TEXT,
			is_published BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CHECK (jsonb_typeof(hints_json) = 'array')
		)`,
		`CREATE INDEX IF NOT EXISTS tasks_room_id_idx ON tasks (room_id)`,
		`CREATE INDEX IF NOT EXISTS tasks_module_id_idx ON tasks (module_id)`,
		`CREATE INDEX IF NOT EXISTS tasks_asset_id_idx ON tasks (asset_id)`,
		`CREATE INDEX IF NOT EXISTS tasks_room_order_idx ON tasks (room_id, order_no)`,

		`CREATE TABLE IF NOT EXISTS lab_sessions (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
			task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
			status TEXT NOT NULL CHECK (status IN ('pending','initializing','running','stopped','terminated','error')),
			started_at TIMESTAMPTZ,
			expires_at TIMESTAMPTZ,
			network_name TEXT,
			target_container_id TEXT,
			attack_container_id TEXT,
			connection_info_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			docker_image TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CHECK (jsonb_typeof(connection_info_json) = 'object')
		)`,
		`CREATE INDEX IF NOT EXISTS lab_sessions_user_id_idx ON lab_sessions (user_id)`,
		`CREATE INDEX IF NOT EXISTS lab_sessions_room_id_idx ON lab_sessions (room_id)`,
		`CREATE INDEX IF NOT EXISTS lab_sessions_task_id_idx ON lab_sessions (task_id)`,
		`CREATE INDEX IF NOT EXISTS lab_sessions_status_idx ON lab_sessions (status)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS lab_sessions_single_active_per_user
			ON lab_sessions (user_id)
			WHERE status IN ('pending','initializing','running')`,

		`CREATE TABLE IF NOT EXISTS progress (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
			task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
			state TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','completed')),
			started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			completed_at TIMESTAMPTZ,
			attempts BIGINT NOT NULL DEFAULT 0,
			points_earned BIGINT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE (user_id, task_id)
		)`,
		`CREATE INDEX IF NOT EXISTS progress_user_id_idx ON progress (user_id)`,
		`CREATE INDEX IF NOT EXISTS progress_task_id_idx ON progress (task_id)`,
	}

	for _, stmt := range ddl {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	log.Println("✅ PostgreSQL schema ready")
	return nil
}

// SeedPostgresBaseline inserts rooms, modules, tasks, and assets for the three
// core XploitVerse labs when the database is empty.
func SeedPostgresBaseline(ctx context.Context, pool *pgxpool.Pool) error {
	var roomCount int64
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM rooms`).Scan(&roomCount); err != nil {
		return fmt.Errorf("failed to count rooms: %w", err)
	}
	if roomCount > 0 {
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin seed transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// ── Helper ──────────────────────────────────────────────────────────────
	hashFlag := func(flag string) string {
		h := sha256.Sum256([]byte(flag))
		return hex.EncodeToString(h[:])
	}

	// ════════════════════════════════════════════════════════════════════════
	// LAB 1: SQL Injection Lab
	// ════════════════════════════════════════════════════════════════════════
	var sqliAssetID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
		VALUES ($1, $2, $3, $4, NULL, '["22/tcp","5000/tcp"]'::jsonb, '{}'::jsonb, $5, true)
		RETURNING id
	`, "SQL Injection Lab", "custom", "challenges/sqli-lab", "xploitverse/sqli-lab:latest", "target").Scan(&sqliAssetID); err != nil {
		return fmt.Errorf("failed to seed sqli asset: %w", err)
	}

	var sqliRoomID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`, "sqli-lab",
		"SQL Injection Lab",
		"Practice SQL injection against a deliberately vulnerable e-commerce application. Learn Union-based injection, authentication bypass, and data exfiltration from a Flask + SQLite stack.",
		"Easy").Scan(&sqliRoomID); err != nil {
		return fmt.Errorf("failed to seed sqli room: %w", err)
	}

	var sqliModuleID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, 300, true)
		RETURNING id
	`, sqliRoomID, "SQL Injection Fundamentals", "Learn the three core SQLi techniques: Union injection, auth bypass, and blind extraction.").Scan(&sqliModuleID); err != nil {
		return fmt.Errorf("failed to seed sqli module: %w", err)
	}

	// Task 1: Union-based SQLi
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 1, 100, 25, $8, true)
	`, sqliRoomID, sqliModuleID, sqliAssetID,
		"Union-Based Data Exfiltration",
		"# Union-Based SQL Injection\n\nThe VulnShop application at **http://TARGET:5000** has a products page with a category filter that is vulnerable to SQL injection.\n\n## Objective\nUse a UNION-based SQL injection on the `/products` endpoint to discover and dump a hidden database table. The flag is stored inside it.\n\n## Tools\n- `curl` or the web browser inside the terminal\n- The web app shows you the raw SQL query being executed\n\n## Getting Started\n1. Browse to `http://TARGET:5000/products`\n2. Try filtering by category and observe the SQL query\n3. Use UNION SELECT to enumerate tables and extract data",
		"Find the hidden flag in the secrets table using UNION injection.",
		`["The category parameter is directly interpolated into SQL","Try: ' UNION SELECT 1,2,3,4--","Use sql_master or sqlite_master to find table names","The flag is in a table called 'secrets'"]`,
		hashFlag("FLAG{xv_sqli_union_data_exfil}")); err != nil {
		return fmt.Errorf("failed to seed sqli task 1: %w", err)
	}

	// Task 2: Auth bypass
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 2, 100, 25, $8, true)
	`, sqliRoomID, sqliModuleID, sqliAssetID,
		"Authentication Bypass",
		"# Authentication Bypass via SQLi\n\nThe login page at **http://TARGET:5000/login** uses unsafe string concatenation in its SQL query.\n\n## Objective\nBypass the authentication to log in as the **admin** user without knowing the password. The flag is displayed upon successful admin login.\n\n## Getting Started\n1. Navigate to the login page\n2. Observe the SQL query shown after each attempt\n3. Craft a username/password payload that always evaluates to true",
		"Bypass login authentication to get the admin flag.",
		`["The login query checks: WHERE username='X' AND password='Y'","What happens if you close the quote and add OR 1=1?","Try username: admin' -- and any password","The comment -- ignores the rest of the query"]`,
		hashFlag("FLAG{xv_sqli_auth_bypass}")); err != nil {
		return fmt.Errorf("failed to seed sqli task 2: %w", err)
	}

	// Task 3: Root flag
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 3, 100, 25, $8, true)
	`, sqliRoomID, sqliModuleID, sqliAssetID,
		"Escalate to Root Flag",
		"# Root Flag Challenge\n\nThere is a flag file only readable by root at `/root/flag.txt` on the target machine.\n\n## Objective\nFind a way to read the root flag. You have SSH access as `student:student` on port 22.\n\n## Getting Started\n1. SSH into the target: `ssh student@TARGET`\n2. Look for SUID binaries, writable scripts, or sudo misconfigurations\n3. The flag is in `/root/flag.txt`",
		"Read the root flag at /root/flag.txt.",
		`["SSH credentials are student:student","Check for SUID binaries with: find / -perm -4000 2>/dev/null","Look at sudo permissions with: sudo -l","Python3 might be available with elevated privileges"]`,
		hashFlag("FLAG{xv_sqli_database_compromised}")); err != nil {
		return fmt.Errorf("failed to seed sqli task 3: %w", err)
	}

	// ════════════════════════════════════════════════════════════════════════
	// LAB 2: Web Exploitation Basics
	// ════════════════════════════════════════════════════════════════════════
	var webAssetID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
		VALUES ($1, $2, $3, $4, NULL, '["22/tcp","5000/tcp"]'::jsonb, '{}'::jsonb, $5, true)
		RETURNING id
	`, "Web Exploitation Basics", "custom", "challenges/web-basic", "xploitverse/web-basic:latest", "target").Scan(&webAssetID); err != nil {
		return fmt.Errorf("failed to seed web-basic asset: %w", err)
	}

	var webRoomID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`, "web-basic",
		"Web Exploitation Basics",
		"Exploit command injection and directory traversal vulnerabilities in a Flask web application. Learn to chain OS commands and escape restricted directories to read sensitive files.",
		"Easy").Scan(&webRoomID); err != nil {
		return fmt.Errorf("failed to seed web-basic room: %w", err)
	}

	var webModuleID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, 200, true)
		RETURNING id
	`, webRoomID, "Web Attack Vectors", "Master command injection and path traversal — two of the most common web vulnerabilities.").Scan(&webModuleID); err != nil {
		return fmt.Errorf("failed to seed web-basic module: %w", err)
	}

	// Task 1: Command injection
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 1, 100, 25, $8, true)
	`, webRoomID, webModuleID, webAssetID,
		"Command Injection",
		"# Command Injection\n\nThe web application at **http://TARGET:5000** has a `/ping` endpoint that takes a `host` parameter and passes it directly to the system shell.\n\n## Objective\nExploit the command injection vulnerability to read the flag at `/opt/flag.txt`.\n\n## Getting Started\n1. Visit `http://TARGET:5000` to see available endpoints\n2. Try the `/ping?host=127.0.0.1` endpoint\n3. Chain additional OS commands using shell metacharacters (`;`, `|`, `&&`)",
		"Use command injection on /ping to read /opt/flag.txt.",
		`["The host parameter is passed directly to: ping -c 1 <host>","Shell metacharacters like ; and | can chain commands","Try: /ping?host=127.0.0.1;cat /opt/flag.txt","The flag file is at /opt/flag.txt"]`,
		hashFlag("FLAG{xv_web_cmd_injection}")); err != nil {
		return fmt.Errorf("failed to seed web-basic task 1: %w", err)
	}

	// Task 2: Directory traversal
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 2, 100, 25, $8, true)
	`, webRoomID, webModuleID, webAssetID,
		"Directory Traversal",
		"# Directory Traversal (Path Traversal)\n\nThe `/read` endpoint serves files from `/opt/webapp/files/` but does not sanitize the filename parameter.\n\n## Objective\nEscape the restricted directory and read `/opt/flag.txt` using path traversal.\n\n## Getting Started\n1. Visit `http://TARGET:5000/read?file=welcome.txt` to see normal behavior\n2. Try navigating up directories with `../` sequences\n3. The flag is at `/opt/flag.txt` — calculate how many `../` you need",
		"Use directory traversal on /read to read /opt/flag.txt.",
		`["The file parameter is joined with /opt/webapp/files/","Use ../ to go up one directory","Count the depth: /opt/webapp/files/ is 3 levels from /","Try: /read?file=../../../opt/flag.txt"]`,
		hashFlag("FLAG{xv_web_cmd_injection}")); err != nil {
		return fmt.Errorf("failed to seed web-basic task 2: %w", err)
	}

	// ════════════════════════════════════════════════════════════════════════
	// LAB 3: OWASP Top 10 Lab
	// ════════════════════════════════════════════════════════════════════════
	var owaspAssetID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
		VALUES ($1, $2, $3, $4, NULL, '["22/tcp","5000/tcp"]'::jsonb, '{}'::jsonb, $5, true)
		RETURNING id
	`, "OWASP Top 10 Lab", "custom", "challenges/owasp-juice", "xploitverse/owasp-juice:latest", "target").Scan(&owaspAssetID); err != nil {
		return fmt.Errorf("failed to seed owasp asset: %w", err)
	}

	var owaspRoomID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`, "owasp-juice",
		"OWASP Top 10 Lab",
		"Exploit 5 different OWASP Top 10 vulnerabilities in a single Flask application: Reflected XSS, Stored XSS, Insecure Direct Object References (IDOR), Server-Side Request Forgery (SSRF), and Directory Traversal.",
		"Medium").Scan(&owaspRoomID); err != nil {
		return fmt.Errorf("failed to seed owasp room: %w", err)
	}

	var owaspModuleID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, 500, true)
		RETURNING id
	`, owaspRoomID, "OWASP Vulnerability Chain", "Work through five distinct vulnerability classes from the OWASP Top 10 in increasing complexity.").Scan(&owaspModuleID); err != nil {
		return fmt.Errorf("failed to seed owasp module: %w", err)
	}

	// Task 1: Reflected XSS
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 1, 100, 25, $8, true)
	`, owaspRoomID, owaspModuleID, owaspAssetID,
		"Reflected XSS",
		"# Reflected Cross-Site Scripting (XSS)\n\nThe search page at **http://TARGET:5000/search** reflects user input directly into the HTML without sanitization.\n\n## Objective\nDemonstrate a reflected XSS attack by injecting JavaScript that triggers an alert box. The flag is shown on the page.\n\n## Getting Started\n1. Navigate to the search page\n2. Try searching for something and observe how the input appears in the response\n3. Inject a `<script>` tag in the search query parameter",
		"Demonstrate reflected XSS on the search page.",
		`["The q parameter is reflected directly into HTML","Try: /search?q=<script>alert(1)</script>","The flag is displayed on the page: FLAG{xv_owasp_reflected_xss}","Submit the flag once you trigger the XSS"]`,
		hashFlag("FLAG{xv_owasp_reflected_xss}")); err != nil {
		return fmt.Errorf("failed to seed owasp task 1: %w", err)
	}

	// Task 2: Stored XSS
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 2, 100, 25, $8, true)
	`, owaspRoomID, owaspModuleID, owaspAssetID,
		"Stored XSS via Guestbook",
		"# Stored Cross-Site Scripting (XSS)\n\nThe guestbook at **http://TARGET:5000/guestbook** allows posting messages that are stored and displayed to all visitors without sanitization.\n\n## Objective\nPost a guestbook entry containing JavaScript that executes when the page loads. The flag is shown on the page.\n\n## Getting Started\n1. Navigate to the guestbook\n2. Post a normal message and observe how it's displayed\n3. Post a message containing `<script>` tags",
		"Inject stored XSS in the guestbook.",
		`["The message field is rendered without escaping","Post a message like: <script>alert('XSS')</script>","The flag is: FLAG{xv_owasp_stored_xss}","Submit the flag once your script persists on page reload"]`,
		hashFlag("FLAG{xv_owasp_stored_xss}")); err != nil {
		return fmt.Errorf("failed to seed owasp task 2: %w", err)
	}

	// Task 3: IDOR
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 3, 100, 25, $8, true)
	`, owaspRoomID, owaspModuleID, owaspAssetID,
		"Insecure Direct Object Reference (IDOR)",
		"# IDOR — Insecure Direct Object Reference\n\nThe profile page at **http://TARGET:5000/profile/2** shows your profile. But does it check authorization?\n\n## Objective\nAccess another user's profile to find the admin's secret notes, which contain the flag.\n\n## Getting Started\n1. Visit your profile at `/profile/2`\n2. Notice the user ID in the URL\n3. Try accessing other user IDs (hint: start from 1)",
		"Access the admin profile via IDOR to find the flag.",
		`["You're logged in as user ID 2 (alice)","The admin is typically user ID 1","Try: /profile/1","The admin's notes contain the flag"]`,
		hashFlag("FLAG{xv_owasp_idor_admin_access}")); err != nil {
		return fmt.Errorf("failed to seed owasp task 3: %w", err)
	}

	// Task 4: SSRF
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 4, 100, 25, $8, true)
	`, owaspRoomID, owaspModuleID, owaspAssetID,
		"Server-Side Request Forgery (SSRF)",
		"# SSRF — Server-Side Request Forgery\n\nThe URL fetcher at **http://TARGET:5000/fetch** takes a URL and fetches its content from the server side.\n\n## Objective\nAbuse the URL fetcher to access an internal-only endpoint or read local files from the server. Two flags are available:\n- Access the internal admin panel\n- Read the secret file at `/opt/secret/admin_key.txt`\n\n## Getting Started\n1. Visit the URL fetch page\n2. Try fetching `http://127.0.0.1:5000/internal/admin`\n3. Try the `file://` protocol to read local files",
		"Use SSRF to access internal endpoints or read local files.",
		`["The fetch endpoint makes server-side HTTP requests","Try fetching: http://127.0.0.1:5000/internal/admin","The file:// protocol can read local files","Try: file:///opt/secret/admin_key.txt"]`,
		hashFlag("FLAG{xv_owasp_ssrf_internal_access}")); err != nil {
		return fmt.Errorf("failed to seed owasp task 4: %w", err)
	}

	// Task 5: Path Traversal
	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 5, 100, 25, $8, true)
	`, owaspRoomID, owaspModuleID, owaspAssetID,
		"Path Traversal to Root Flag",
		"# Path Traversal\n\nThe document reader at **http://TARGET:5000/read** serves files from `/app/docs/` but doesn't sanitize the filename.\n\n## Objective\nEscape the document directory and read the root flag at `/root/flag.txt`.\n\n## Getting Started\n1. Visit `/read?file=welcome.txt` to see normal behavior\n2. Use `../` sequences to traverse up from `/app/docs/`\n3. Navigate to `/root/flag.txt`",
		"Use path traversal on /read to reach /root/flag.txt.",
		`["The file parameter is joined with /app/docs/","Use ../ to navigate up directories","/app/docs/ to /root/ requires going up: ../../root/flag.txt","Try: /read?file=../../root/flag.txt"]`,
		hashFlag("FLAG{xv_owasp_path_traversal}")); err != nil {
		return fmt.Errorf("failed to seed owasp task 5: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}

	log.Println("✅ PostgreSQL baseline data seeded (3 labs, 10 tasks)")
	return nil
}

