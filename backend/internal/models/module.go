package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Module represents a unit inside a course.
type Module struct {
	ID           bson.ObjectID `bson:"_id,omitempty" json:"id"`
	CourseID     bson.ObjectID `bson:"courseId" json:"courseId"`
	Title        string        `bson:"title" json:"title"`
	Description  string        `bson:"description,omitempty" json:"description,omitempty"`
	Order        int           `bson:"order" json:"order"`
	PointsReward int           `bson:"pointsReward" json:"pointsReward"`
	IsPublished  bool          `bson:"isPublished" json:"isPublished"`
	CreatedAt    time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time     `bson:"updatedAt" json:"updatedAt"`
}
