package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	TaskTypeQuestion    = "question"
	TaskTypeFlag        = "flag"
	TaskTypeInteractive = "interactive"
)

// Task represents a challenge/task inside a module.
type Task struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	ModuleID    bson.ObjectID `bson:"moduleId" json:"moduleId"`
	Title       string        `bson:"title" json:"title"`
	Type        string        `bson:"type" json:"type"`
	Order       int           `bson:"order" json:"order"`
	Prompt      string        `bson:"prompt,omitempty" json:"prompt,omitempty"`
	ContentMD   string        `bson:"contentMd,omitempty" json:"contentMd,omitempty"`
	Hints       []string      `bson:"hints,omitempty" json:"hints,omitempty"`
	Points      int           `bson:"points" json:"points"`
	HintPenalty int           `bson:"hintPenalty" json:"hintPenalty"`

	FlagHash string `bson:"flagHash,omitempty" json:"-"`

	IsPublished bool      `bson:"isPublished" json:"isPublished"`
	CreatedAt   time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt" json:"updatedAt"`
}
