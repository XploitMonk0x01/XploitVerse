package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/database"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func hashFlag(flag string) string {
	sum := sha256.Sum256([]byte(flag))
	return hex.EncodeToString(sum[:])
}

func main() {
	cfg := config.Load()

	db, err := database.ConnectDB(cfg.MongoURI)
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}

	ctx := context.Background()

	coursesCol := db.Collection("courses")
	modulesCol := db.Collection("modules")
	tasksCol := db.Collection("tasks")

	// Clear existing content
	if res, err := coursesCol.DeleteMany(ctx, bson.M{}); err == nil {
		log.Printf("🗑️  Cleared %d existing courses", res.DeletedCount)
	}
	if res, err := modulesCol.DeleteMany(ctx, bson.M{}); err == nil {
		log.Printf("🗑️  Cleared %d existing modules", res.DeletedCount)
	}
	if res, err := tasksCol.DeleteMany(ctx, bson.M{}); err == nil {
		log.Printf("🗑️  Cleared %d existing tasks", res.DeletedCount)
	}

	now := time.Now()

	course := models.Course{
		Title:       "Web Exploitation Basics",
		Slug:        "web-exploitation-basics",
		Description: "Learn the fundamentals of web exploitation through short, focused modules and hands-on tasks.",
		Difficulty:  models.DifficultyEasy,
		Category:    "Web",
		Tags:        []string{"web", "beginner"},
		IsPremium:   false,
		IsPublished: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	courseRes, err := coursesCol.InsertOne(ctx, course)
	if err != nil {
		log.Fatalf("❌ Failed to seed course: %v", err)
	}
	courseID := courseRes.InsertedID.(bson.ObjectID)

	modules := []models.Module{
		{
			CourseID:     courseID,
			Title:        "HTTP & Requests",
			Description:  "Understand requests, responses, headers, cookies.",
			Order:        1,
			PointsReward: 50,
			IsPublished:  true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			CourseID:     courseID,
			Title:        "Input Validation",
			Description:  "How user input becomes vulnerabilities.",
			Order:        2,
			PointsReward: 75,
			IsPublished:  true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	moduleDocs := make([]interface{}, 0, len(modules))
	for _, m := range modules {
		moduleDocs = append(moduleDocs, m)
	}
	modRes, err := modulesCol.InsertMany(ctx, moduleDocs)
	if err != nil {
		log.Fatalf("❌ Failed to seed modules: %v", err)
	}

	moduleID1 := modRes.InsertedIDs[0].(bson.ObjectID)
	moduleID2 := modRes.InsertedIDs[1].(bson.ObjectID)

	tasks := []interface{}{
		models.Task{
			ModuleID:     moduleID1,
			Title:        "Identify request components",
			Type:         models.TaskTypeQuestion,
			Order:        1,
			Prompt:       "In your own words, what is the difference between a header and a cookie?",
			Points:       25,
			HintPenalty:  5,
			IsPublished:  true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.Task{
			ModuleID:     moduleID2,
			Title:        "Spot unsafe input",
			Type:         models.TaskTypeInteractive,
			Order:        1,
			Prompt:       "Look at the example code snippet and identify one unsafe input usage.",
			ContentMD:    "You will later see a vulnerable snippet here.",
			Points:       40,
			HintPenalty:  10,
			IsPublished:  true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.Task{
			ModuleID:     moduleID2,
			Title:        "Submit your first flag",
			Type:         models.TaskTypeFlag,
			Order:        2,
			Prompt:       "Submit the demo flag to test scoring.",
			Points:       50,
			HintPenalty:  10,
			FlagHash:     hashFlag("FLAG{demo-flag}"),
			IsPublished:  true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	if _, err := tasksCol.InsertMany(ctx, tasks); err != nil {
		log.Fatalf("❌ Failed to seed tasks: %v", err)
	}

	// Indexes
	indexModelsCourses := []mongo.IndexModel{
		{Keys: bson.D{{Key: "slug", Value: 1}}, Options: options.Index().SetName("slug_1").SetUnique(true)},
		{Keys: bson.D{{Key: "isPublished", Value: 1}}},
		{Keys: bson.D{{Key: "title", Value: "text"}, {Key: "description", Value: "text"}}},
	}
	_, _ = coursesCol.Indexes().CreateMany(ctx, indexModelsCourses)

	indexModelsModules := []mongo.IndexModel{
		{Keys: bson.D{{Key: "courseId", Value: 1}, {Key: "order", Value: 1}}},
		{Keys: bson.D{{Key: "isPublished", Value: 1}}},
	}
	_, _ = modulesCol.Indexes().CreateMany(ctx, indexModelsModules)

	indexModelsTasks := []mongo.IndexModel{
		{Keys: bson.D{{Key: "moduleId", Value: 1}, {Key: "order", Value: 1}}},
		{Keys: bson.D{{Key: "isPublished", Value: 1}}},
	}
	_, _ = tasksCol.Indexes().CreateMany(ctx, indexModelsTasks)

	log.Println("✅ Seeded course content successfully!")
}
