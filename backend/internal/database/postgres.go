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
			exposed_ports_json JSONB NOT NULL DEFAULT '[]'::jsonb,
			env_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			type TEXT NOT NULL DEFAULT 'target' CHECK (type IN ('target','attack')),
			is_active BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CHECK (jsonb_typeof(exposed_ports_json) = 'array'),
			CHECK (jsonb_typeof(env_json) = 'object')
		)`,

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

// SeedPostgresBaseline inserts a minimal room/module/task/asset dataset when
// the database is empty, enabling end-to-end new.md flows immediately.
func SeedPostgresBaseline(ctx context.Context, pool *pgxpool.Pool) error {
	var roomCount int64
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM rooms`).Scan(&roomCount); err != nil {
		return fmt.Errorf("failed to count rooms: %w", err)
	}
	if roomCount > 0 {
		return nil
	}

	flag := "THM{basic_sqli_1337}"
	hash := sha256.Sum256([]byte(flag))
	flagHash := hex.EncodeToString(hash[:])

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin seed transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var assetID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO assets (name, source_type, source_ref, docker_image, exposed_ports_json, env_json, type, is_active)
		VALUES ($1, $2, $3, $4, '["80/tcp"]'::jsonb, '{}'::jsonb, $5, true)
		RETURNING id
	`, "Basic SQLi Web Lab", "custom", "seeded baseline", "xploitverse/web-basic:latest", "target").Scan(&assetID); err != nil {
		return fmt.Errorf("failed to seed asset: %w", err)
	}

	var roomID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`, "intro-sqli-room", "Intro to SQL Injection", "Practice basic SQL injection against a vulnerable login page.", "Easy").Scan(&roomID); err != nil {
		return fmt.Errorf("failed to seed room: %w", err)
	}

	var moduleID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, 100, true)
		RETURNING id
	`, roomID, "Module 1", "Foundations").Scan(&moduleID); err != nil {
		return fmt.Errorf("failed to seed module: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, '["Try payloads like '' OR 1=1--"]'::jsonb, 1, 100, 0, $7, true)
	`, roomID, moduleID, assetID, "Dump the users table and find the flag", "Find the flag inside the vulnerable web application.", "Find and submit the flag.", flagHash); err != nil {
		return fmt.Errorf("failed to seed task: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}

	log.Println("✅ PostgreSQL baseline data seeded")
	return nil
}
