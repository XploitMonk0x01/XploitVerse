package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Course represents a learning course/track.
type Course struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string        `bson:"title" json:"title"`
	Slug        string        `bson:"slug" json:"slug"`
	Description string        `bson:"description" json:"description"`
	Difficulty  string        `bson:"difficulty" json:"difficulty"`
	Category    string        `bson:"category,omitempty" json:"category,omitempty"`
	Tags        []string      `bson:"tags,omitempty" json:"tags,omitempty"`

	IsPremium   bool `bson:"isPremium" json:"isPremium"`
	IsPublished bool `bson:"isPublished" json:"isPublished"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
