package main

import (
	"context"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/database"
)

type assetSeed struct {
	Name             string
	SourceType       string
	SourceRef        string
	DockerImage      string
	ExposedPortsJSON string
	EnvJSON          string
	Type             string
}

func main() {
	cfg := config.Load()

	db, err := database.ConnectPostgres(cfg.PostgresURI)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	assets := []assetSeed{
		{Name: "Basic SQLi Web Lab", SourceType: "custom", SourceRef: "challenges/sqli-lab", DockerImage: "xploitverse/sqli-lab:latest", ExposedPortsJSON: `["80/tcp"]`, EnvJSON: `{}`, Type: "target"},
		{Name: "Web Basics", SourceType: "custom", SourceRef: "challenges/web-basic", DockerImage: "xploitverse/web-basic:latest", ExposedPortsJSON: `["80/tcp"]`, EnvJSON: `{}`, Type: "target"},
		{Name: "Reverse Shell Lab", SourceType: "custom", SourceRef: "challenges/reverse-shell", DockerImage: "xploitverse/reverse-shell:latest", ExposedPortsJSON: `["80/tcp"]`, EnvJSON: `{}`, Type: "target"},
		{Name: "OWASP Juice Lab", SourceType: "owasp-vulconhub", SourceRef: "challenges/owasp-juice", DockerImage: "xploitverse/owasp-juice:latest", ExposedPortsJSON: `["3000/tcp"]`, EnvJSON: `{}`, Type: "target"},
		{Name: "Linux PrivEsc", SourceType: "custom", SourceRef: "challenges/privesc-linux", DockerImage: "xploitverse/privesc-linux:latest", ExposedPortsJSON: `["22/tcp"]`, EnvJSON: `{}`, Type: "target"},
		{Name: "Network Recon", SourceType: "custom", SourceRef: "challenges/network-recon", DockerImage: "xploitverse/network-recon:latest", ExposedPortsJSON: `[]`, EnvJSON: `{}`, Type: "target"},
	}

	inserted := 0
	updated := 0
	for _, asset := range assets {
		var existingID int64
		err := db.QueryRow(ctx, `SELECT id FROM assets WHERE LOWER(name)=LOWER($1) LIMIT 1`, asset.Name).Scan(&existingID)
		switch {
		case err == nil:
			if _, err := db.Exec(ctx, `
				UPDATE assets
				SET source_type=$1, source_ref=$2, docker_image=$3,
					exposed_ports_json=$4::jsonb, env_json=$5::jsonb,
					type=$6, is_active=true, updated_at=now()
				WHERE id=$7
			`, asset.SourceType, asset.SourceRef, asset.DockerImage, asset.ExposedPortsJSON, asset.EnvJSON, asset.Type, existingID); err != nil {
				log.Fatalf("❌ Failed to update asset %q: %v", asset.Name, err)
			}
			updated++
		case errors.Is(err, pgx.ErrNoRows):
			if _, err := db.Exec(ctx, `
				INSERT INTO assets (name, source_type, source_ref, docker_image, exposed_ports_json, env_json, type, is_active)
				VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, true)
			`, asset.Name, asset.SourceType, asset.SourceRef, asset.DockerImage, asset.ExposedPortsJSON, asset.EnvJSON, asset.Type); err != nil {
				log.Fatalf("❌ Failed to insert asset %q: %v", asset.Name, err)
			}
			inserted++
		default:
			log.Fatalf("❌ Failed to query existing asset %q: %v", asset.Name, err)
		}
	}

	log.Printf("✅ PostgreSQL assets seed complete (inserted=%d updated=%d)", inserted, updated)
}
