package main

import (
	"context"
	"log"
	"time"

	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/database"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	cfg := config.Load()

	db, err := database.ConnectDB(cfg.MongoURI)
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}

	ctx := context.Background()
	col := db.Collection("labs")

	// Clear existing labs
	result, err := col.DeleteMany(ctx, bson.M{})
	if err != nil {
		log.Fatalf("❌ Failed to clear labs: %v", err)
	}
	log.Printf("🗑️  Cleared %d existing labs", result.DeletedCount)

	now := time.Now()

	labs := []interface{}{
		models.Lab{
			Title:             "SQL Injection Fundamentals",
			Description:       "Learn the basics of SQL injection attacks. Practice identifying and exploiting SQL injection vulnerabilities in web applications. This lab covers UNION-based, blind, and error-based SQL injection techniques.",
			Difficulty:        models.DifficultyEasy,
			Category:          models.CategoryRedTeam,
			EstimatedDuration: 60,
			Objectives: []string{
				"Identify SQL injection points in a web application",
				"Extract database information using UNION-based injection",
				"Bypass authentication using SQL injection",
				"Practice blind SQL injection techniques",
			},
			Tools: []string{"SQLMap", "Burp Suite", "Browser Developer Tools"},
			Tags:  []string{"sql", "injection", "web", "database", "beginner"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.micro",
				Ports:        []int{22, 80, 3306},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Lab{
			Title:             "Cross-Site Scripting (XSS) Lab",
			Description:       "Explore different types of XSS vulnerabilities including reflected, stored, and DOM-based XSS. Learn to craft payloads and bypass common security filters.",
			Difficulty:        models.DifficultyEasy,
			Category:          models.CategoryRedTeam,
			EstimatedDuration: 45,
			Objectives: []string{
				"Identify reflected XSS vulnerabilities",
				"Exploit stored XSS in a web application",
				"Understand DOM-based XSS",
				"Bypass basic XSS filters",
			},
			Tools: []string{"Burp Suite", "Browser Developer Tools", "XSStrike"},
			Tags:  []string{"xss", "web", "javascript", "client-side"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.micro",
				Ports:        []int{22, 80},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Lab{
			Title:             "Linux Privilege Escalation",
			Description:       "Practice various Linux privilege escalation techniques. Start as a low-privilege user and work your way to root access through misconfigurations and vulnerabilities.",
			Difficulty:        models.DifficultyMedium,
			Category:          models.CategoryRedTeam,
			EstimatedDuration: 90,
			Objectives: []string{
				"Enumerate the system for privilege escalation vectors",
				"Exploit SUID binaries",
				"Leverage misconfigured sudo permissions",
				"Exploit kernel vulnerabilities",
			},
			Tools: []string{"LinPEAS", "GTFOBins", "Linux Exploit Suggester"},
			Tags:  []string{"privilege-escalation", "linux", "system"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.small",
				Ports:        []int{22},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Lab{
			Title:             "Network Traffic Analysis",
			Description:       "Analyze network traffic captures to identify suspicious activities, extract credentials, and detect common attack patterns using Wireshark and command-line tools.",
			Difficulty:        models.DifficultyMedium,
			Category:          models.CategoryBlueTeam,
			EstimatedDuration: 75,
			Objectives: []string{
				"Analyze pcap files with Wireshark",
				"Identify suspicious network patterns",
				"Extract credentials from network traffic",
				"Detect common attack signatures",
			},
			Tools: []string{"Wireshark", "tshark", "tcpdump", "NetworkMiner"},
			Tags:  []string{"network", "traffic-analysis", "wireshark", "defense"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.micro",
				Ports:        []int{22},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Lab{
			Title:             "Web Application Penetration Testing",
			Description:       "Perform a comprehensive penetration test against a vulnerable web application. Combine multiple techniques including SQL injection, XSS, file upload vulnerabilities, and authentication bypasses.",
			Difficulty:        models.DifficultyHard,
			Category:          models.CategoryPurpleTeam,
			EstimatedDuration: 120,
			Objectives: []string{
				"Perform reconnaissance on the target application",
				"Identify and exploit multiple vulnerability types",
				"Chain vulnerabilities for maximum impact",
				"Write a professional penetration testing report",
			},
			Tools: []string{"Burp Suite", "Nmap", "SQLMap", "Nikto", "Dirb"},
			Tags:  []string{"web", "pentest", "comprehensive", "advanced"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.medium",
				Ports:        []int{22, 80, 443, 8080, 3306},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Lab{
			Title:             "Incident Response & Forensics",
			Description:       "Investigate a simulated security incident. Analyze system logs, perform memory forensics, and trace the attacker's activities to build a timeline of events.",
			Difficulty:        models.DifficultyHard,
			Category:          models.CategoryBlueTeam,
			EstimatedDuration: 120,
			Objectives: []string{
				"Analyze system and application logs",
				"Perform basic memory forensics",
				"Create an incident timeline",
				"Identify indicators of compromise (IOCs)",
			},
			Tools: []string{"Volatility", "Autopsy", "Log2Timeline", "YARA"},
			Tags:  []string{"forensics", "incident-response", "blue-team", "logs"},
			EnvironmentConfig: models.EnvironmentConfig{
				InstanceType: "t2.medium",
				Ports:        []int{22},
			},
			IsActive:    true,
			IsPublished: true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	insertResult, err := col.InsertMany(ctx, labs)
	if err != nil {
		log.Fatalf("❌ Failed to seed labs: %v", err)
	}

	log.Printf("✅ Seeded %d labs successfully!", len(insertResult.InsertedIDs))

	// Create indexes
	indexModels := []mongo.IndexModel{
		{Keys: bson.D{{Key: "category", Value: 1}}},
		{Keys: bson.D{{Key: "difficulty", Value: 1}}},
		{Keys: bson.D{{Key: "isActive", Value: 1}, {Key: "isPublished", Value: 1}}},
		{Keys: bson.D{{Key: "title", Value: "text"}, {Key: "description", Value: "text"}}},
	}

	_, err = col.Indexes().CreateMany(ctx, indexModels)
	if err != nil {
		log.Printf("⚠️  Warning: Failed to create indexes: %v", err)
	} else {
		log.Println("✅ Lab indexes created")
	}

	log.Println("🎉 Seed complete!")
}
