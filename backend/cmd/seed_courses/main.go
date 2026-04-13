package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"

	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/database"
)

func hashFlag(flag string) string {
	sum := sha256.Sum256([]byte(flag))
	return hex.EncodeToString(sum[:])
}

func main() {
	cfg := config.Load()

	db, err := database.ConnectPostgres(cfg.PostgresURI)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Fatalf("❌ Failed to start transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	var roomID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public, updated_at)
		VALUES ($1, $2, $3, $4, true, now())
		ON CONFLICT (slug) DO UPDATE
		SET title=EXCLUDED.title,
			description=EXCLUDED.description,
			difficulty=EXCLUDED.difficulty,
			is_public=EXCLUDED.is_public,
			updated_at=now()
		RETURNING id
	`, "web-exploitation-basics", "Web Exploitation Basics", "Learn the fundamentals of web exploitation through short, focused modules and hands-on tasks.", "Easy").Scan(&roomID)
	if err != nil {
		log.Fatalf("❌ Failed to upsert room: %v", err)
	}

	// Replace room content deterministically so local dev data stays reproducible.
	if _, err := tx.Exec(ctx, `DELETE FROM tasks WHERE room_id=$1`, roomID); err != nil {
		log.Fatalf("❌ Failed to clear room tasks: %v", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM modules WHERE room_id=$1`, roomID); err != nil {
		log.Fatalf("❌ Failed to clear room modules: %v", err)
	}

	var moduleHTTPID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, 50, true)
		RETURNING id
	`, roomID, "HTTP & Requests", "Understand requests, responses, headers, and cookies.").Scan(&moduleHTTPID)
	if err != nil {
		log.Fatalf("❌ Failed to create module 1: %v", err)
	}

	var moduleInputID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 2, 75, true)
		RETURNING id
	`, roomID, "Input Validation", "How user input becomes vulnerabilities.").Scan(&moduleInputID)
	if err != nil {
		log.Fatalf("❌ Failed to create module 2: %v", err)
	}

	var webAssetID *int64
	var existingAssetID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM assets WHERE LOWER(name)=LOWER($1) LIMIT 1`, "Web Basics").Scan(&existingAssetID); err == nil {
		webAssetID = &existingAssetID
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, is_published, flag_hash)
		VALUES ($1, $2, $3, $4, 'question', 'none', $5, $6, '[]'::jsonb, 1, 25, 5, true, NULL)
	`, roomID, moduleHTTPID, webAssetID, "Identify request components", "In your own words, what is the difference between a header and a cookie?", "Explain header vs cookie."); err != nil {
		log.Fatalf("❌ Failed to insert task 1: %v", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, is_published, flag_hash)
		VALUES ($1, $2, $3, $4, 'interactive', 'none', $5, $6, '["Review user-controlled input paths first"]'::jsonb, 1, 40, 10, true, NULL)
	`, roomID, moduleInputID, webAssetID, "Spot unsafe input", "Look at the example code snippet and identify one unsafe input usage.", "Find one unsafe input usage."); err != nil {
		log.Fatalf("❌ Failed to insert task 2: %v", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, is_published, flag_hash)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, '["The demo format is FLAG{...}"]'::jsonb, 2, 50, 10, true, $7)
	`, roomID, moduleInputID, webAssetID, "Submit your first flag", "Submit the demo flag to test scoring.", "Submit the demo flag.", hashFlag("FLAG{demo-flag}")); err != nil {
		log.Fatalf("❌ Failed to insert task 3: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("❌ Failed to commit seed transaction: %v", err)
	}

	log.Println("✅ Seeded PostgreSQL room/module/task content successfully")
}
