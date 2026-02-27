package services

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// AutoTerminationService checks for sessions that need to be auto-terminated.
type AutoTerminationService struct {
	DB        *mongo.Database
	DockerSvc *DockerService
	Interval  time.Duration
}

// NewAutoTerminationService creates a new auto-termination service.
func NewAutoTerminationService(db *mongo.Database, dockerSvc *DockerService) *AutoTerminationService {
	return &AutoTerminationService{
		DB:        db,
		DockerSvc: dockerSvc,
		Interval:  5 * time.Minute,
	}
}

// Start begins the auto-termination check loop in a goroutine.
func (s *AutoTerminationService) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(s.Interval)
		defer ticker.Stop()

		log.Println("🕐 Auto-termination service started (checking every 5 minutes)")

		for {
			select {
			case <-ctx.Done():
				log.Println("🕐 Auto-termination service stopped")
				return
			case <-ticker.C:
				s.checkExpiredSessions(ctx)
			}
		}
	}()
}

func (s *AutoTerminationService) checkExpiredSessions(ctx context.Context) {
	col := s.DB.Collection("labsessions")
	now := time.Now()

	filter := bson.M{
		"status":          bson.M{"$in": []string{"running", "initializing"}},
		"autoTerminateAt": bson.M{"$lte": now},
	}

	cursor, err := col.Find(ctx, filter)
	if err != nil {
		log.Printf("❌ Auto-termination check error: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var expired []struct {
		ID          interface{} `bson:"_id"`
		ContainerID string      `bson:"containerId"`
	}
	if err := cursor.All(ctx, &expired); err != nil {
		return
	}

	for _, session := range expired {
		log.Printf("⏰ Auto-terminating session: %v (containerId=%s)", session.ID, session.ContainerID)

		// Stop Docker container if present
		if s.DockerSvc != nil && session.ContainerID != "" {
			_ = s.DockerSvc.StopContainer(ctx, session.ContainerID)
		}

		col.UpdateOne(ctx, bson.M{"_id": session.ID}, bson.M{
			"$set": bson.M{
				"status":    "terminated",
				"endTime":   now,
				"updatedAt": now,
			},
			"$push": bson.M{
				"statusHistory": bson.M{
					"status":    "terminated",
					"timestamp": now,
					"message":   "Auto-terminated due to exceeding maximum duration",
				},
			},
		})
	}

	if len(expired) > 0 {
		log.Printf("⏰ Auto-terminated %d expired sessions", len(expired))
	}
}
