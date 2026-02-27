package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// UserTaskProgress stores per-user progress for a task.
type UserTaskProgress struct {
	ID           bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       bson.ObjectID `bson:"userId" json:"userId"`
	TaskID       bson.ObjectID `bson:"taskId" json:"taskId"`
	Attempts     int           `bson:"attempts" json:"attempts"`
	CompletedAt  *time.Time    `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
	PointsEarned int           `bson:"pointsEarned" json:"pointsEarned"`
	CreatedAt    time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time     `bson:"updatedAt" json:"updatedAt"`
}
