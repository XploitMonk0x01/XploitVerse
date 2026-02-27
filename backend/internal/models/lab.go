package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Lab difficulty levels.
const (
	DifficultyEasy   = "Easy"
	DifficultyMedium = "Medium"
	DifficultyHard   = "Hard"
)

// Lab categories for team types.
const (
	CategoryRedTeam    = "Red Team"
	CategoryBlueTeam   = "Blue Team"
	CategoryPurpleTeam = "Purple Team"
)

// EnvironmentConfig holds the AWS environment configuration for a lab.
type EnvironmentConfig struct {
	InstanceType string `bson:"instanceType" json:"instanceType"`
	AmiID        string `bson:"amiId,omitempty" json:"amiId,omitempty"`
	Ports        []int  `bson:"ports,omitempty" json:"ports,omitempty"`
}

// Lab represents a cybersecurity training lab in MongoDB.
type Lab struct {
	ID                bson.ObjectID     `bson:"_id,omitempty" json:"id"`
	Title             string            `bson:"title" json:"title"`
	Description       string            `bson:"description" json:"description"`
	Difficulty        string            `bson:"difficulty" json:"difficulty"`
	Category          string            `bson:"category" json:"category"`
	EstimatedDuration int               `bson:"estimatedDuration" json:"estimatedDuration"`
	Objectives        []string          `bson:"objectives,omitempty" json:"objectives,omitempty"`
	Tools             []string          `bson:"tools,omitempty" json:"tools,omitempty"`
	Tags              []string          `bson:"tags,omitempty" json:"tags,omitempty"`
	EnvironmentConfig EnvironmentConfig `bson:"environmentConfig" json:"environmentConfig"`
	IsActive          bool              `bson:"isActive" json:"isActive"`
	IsPublished       bool              `bson:"isPublished" json:"isPublished"`
	TimesCompleted    int               `bson:"timesCompleted" json:"timesCompleted"`
	AverageRating     float64           `bson:"averageRating" json:"averageRating"`
	CreatedAt         time.Time         `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time         `bson:"updatedAt" json:"updatedAt"`
}

// DurationFormatted returns a human-readable duration string.
func (l *Lab) DurationFormatted() string {
	hours := l.EstimatedDuration / 60
	mins := l.EstimatedDuration % 60
	if hours > 0 {
		if mins > 0 {
			return formatDuration(hours, mins)
		}
		return formatHours(hours)
	}
	return formatMinutes(mins)
}

func formatDuration(h, m int) string {
	return string(rune('0'+h)) + "h " + string(rune('0'+m)) + "m"
}

func formatHours(h int) string {
	return string(rune('0'+h)) + "h"
}

func formatMinutes(m int) string {
	return string(rune('0'+m)) + "m"
}
