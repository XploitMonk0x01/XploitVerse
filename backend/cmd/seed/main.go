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
	Description      string
	Difficulty       string
	Category         string
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
		{
			Name:             "AWS Autopsy: Capital One SSRF Breach",
			SourceType:       "custom",
			SourceRef:        "challenges/aws-autopsy",
			DockerImage:      "xploitverse/aws-autopsy:latest",
			ExposedPortsJSON: `["22/tcp", "5000/tcp", "8000/tcp", "9000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Recreate the 2019 Capital One data breach ($80M fine). Exploit SSRF to steal IAM credentials via IMDSv1, then exfiltrate sensitive S3 data.",
			Difficulty:       "Hard",
			Category:         "Cloud Security",
		},
		{
			Name:             "Basic SQLi Web Lab",
			SourceType:       "custom",
			SourceRef:        "challenges/sqli-lab",
			DockerImage:      "xploitverse/sqli-lab:latest",
			ExposedPortsJSON: `["22/tcp", "5000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Hands-on SQL injection testing. Dump database tables, bypass authentication, and extract sensitive flags from an unsafe Flask application.",
			Difficulty:       "Easy",
			Category:         "Web Exploitation",
		},
		{
			Name:             "Web Basics",
			SourceType:       "custom",
			SourceRef:        "challenges/web-basic",
			DockerImage:      "xploitverse/web-basic:latest",
			ExposedPortsJSON: `["22/tcp", "5000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Command injection & directory traversal in Flask. Practice URL parameter inspection and path manipulation.",
			Difficulty:       "Easy",
			Category:         "Web Exploitation",
		},
		{
			Name:             "Reverse Shell Lab",
			SourceType:       "custom",
			SourceRef:        "challenges/reverse-shell",
			DockerImage:      "xploitverse/reverse-shell:latest",
			ExposedPortsJSON: `["22/tcp", "5000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Command injection to initial access foothold, lateral movement via SSH keys, and system persistence via cron jobs.",
			Difficulty:       "Medium",
			Category:         "Red Team",
		},
		{
			Name:             "OWASP Juice Lab",
			SourceType:       "owasp-vulconhub",
			SourceRef:        "challenges/owasp-juice",
			DockerImage:      "xploitverse/owasp-juice:latest",
			ExposedPortsJSON: `["22/tcp", "5000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Multi-stage OWASP Top 10 vulnerabilities including Reflected/Stored XSS, IDOR, SSRF, and Directory Traversal.",
			Difficulty:       "Medium",
			Category:         "Web Exploitation",
		},
		{
			Name:             "Linux PrivEsc",
			SourceType:       "custom",
			SourceRef:        "challenges/privesc-linux",
			DockerImage:      "xploitverse/privesc-linux:latest",
			ExposedPortsJSON: `["22/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Advanced Linux privilege escalation across 8 real-world vectors including SUID binaries, writable cron jobs, and sudo misconfigurations.",
			Difficulty:       "Hard",
			Category:         "Privilege Escalation",
		},
		{
			Name:             "Network Recon",
			SourceType:       "custom",
			SourceRef:        "challenges/network-recon",
			DockerImage:      "xploitverse/network-recon:latest",
			ExposedPortsJSON: `["21/tcp", "22/tcp", "80/tcp", "8888/tcp", "9090/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Port scanning, service version enumeration, banner grabbing, and hidden API discovery using Nmap, Netcat, and Gobuster.",
			Difficulty:       "Easy",
			Category:         "Reconnaissance",
		},
		{
			Name:             "Boot2Root CTF",
			SourceType:       "custom",
			SourceRef:        "challenges/boot2root",
			DockerImage:      "xploitverse/boot2root:latest",
			ExposedPortsJSON: `["22/tcp", "80/tcp", "5000/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Full kill-chain Boot2Root machine: web enumeration, SQL injection, SSH foothold, hash cracking, and sudo python3 root escalation.",
			Difficulty:       "Hard",
			Category:         "Red Team",
		},
		{
			Name:             "PrivEsc Basic",
			SourceType:       "custom",
			SourceRef:        "challenges/privesc-basic",
			DockerImage:      "xploitverse/privesc-basic:latest",
			ExposedPortsJSON: `["22/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Fundamental Linux privilege escalation: custom SUID binaries, writable system cron scripts, and NOPASSWD sudo vim exploitation.",
			Difficulty:       "Medium",
			Category:         "Privilege Escalation",
		},
		{
			Name:             "Recon Basic",
			SourceType:       "custom",
			SourceRef:        "challenges/recon-basic",
			DockerImage:      "xploitverse/recon-basic:latest",
			ExposedPortsJSON: `["22/tcp", "1337/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Entry-level service discovery and port scanning. Practice finding hidden background listeners on non-standard ports.",
			Difficulty:       "Easy",
			Category:         "Reconnaissance",
		},
		{
			Name:             "Linux Fundamentals",
			SourceType:       "custom",
			SourceRef:        "challenges/linux-basics",
			DockerImage:      "xploitverse/linux-basics:latest",
			ExposedPortsJSON: `["22/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Mastering the Linux CLI: navigating deep directory structures, inspecting hidden files, decoding base64/grep, and file permission awareness.",
			Difficulty:       "Easy",
			Category:         "Linux Fundamentals",
		},
		{
			Name:             "Cryptography Basics",
			SourceType:       "custom",
			SourceRef:        "challenges/crypto-basics",
			DockerImage:      "xploitverse/crypto-basics:latest",
			ExposedPortsJSON: `["22/tcp"]`,
			EnvJSON:          `{}`,
			Type:             "target",
			Description:      "Decrypting Base64, Hex, ROT13, Binary strings, cracking MD5 password hashes, XOR ciphers, and unverified JWT payload inspection.",
			Difficulty:       "Easy",
			Category:         "Cryptography",
		},
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

	log.Printf("✅ PostgreSQL assets seed complete (total=%d, inserted=%d, updated=%d)", len(assets), inserted, updated)
}
