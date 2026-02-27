package models

import (
	"fmt"
	"math"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Lab session status constants.
const (
	StatusPending      = "pending"
	StatusInitializing = "initializing"
	StatusRunning      = "running"
	StatusStopping     = "stopping"
	StatusStopped      = "stopped"
	StatusTerminated   = "terminated"
	StatusError        = "error"
)

// Lab type constants.
const (
	LabTypeWebExploitation     = "web_exploitation"
	LabTypeNetworkPentesting   = "network_pentesting"
	LabTypePrivilegeEscalation = "privilege_escalation"
	LabTypeMalwareAnalysis     = "malware_analysis"
	LabTypeForensics           = "forensics"
	LabTypeCTFChallenge        = "ctf_challenge"
	LabTypeCustom              = "custom"
)

// StatusHistoryEntry represents a single status change event.
type StatusHistoryEntry struct {
	Status    string    `bson:"status" json:"status"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
	Message   string    `bson:"message,omitempty" json:"message,omitempty"`
}

// AccessCredentials holds lab session access credentials.
type AccessCredentials struct {
	Username string `bson:"username,omitempty" json:"username,omitempty"`
	Password string `bson:"password,omitempty" json:"-"`
}

// Checkpoint represents a completed objective in a lab.
type Checkpoint struct {
	CheckpointID string    `bson:"checkpointId" json:"checkpointId"`
	CompletedAt  time.Time `bson:"completedAt" json:"completedAt"`
	Points       int       `bson:"points" json:"points"`
}

// Flag represents a captured flag in a lab.
type Flag struct {
	FlagID  string    `bson:"flagId" json:"flagId"`
	Flag    string    `bson:"flag" json:"flag"`
	FoundAt time.Time `bson:"foundAt" json:"foundAt"`
	Points  int       `bson:"points" json:"points"`
}

// ActivityLogEntry represents an activity event in a session.
type ActivityLogEntry struct {
	Action    string      `bson:"action" json:"action"`
	Timestamp time.Time   `bson:"timestamp" json:"timestamp"`
	Details   interface{} `bson:"details,omitempty" json:"details,omitempty"`
}

// LabSession represents a user's lab session in MongoDB.
type LabSession struct {
	ID               bson.ObjectID      `bson:"_id,omitempty" json:"id"`
	User             bson.ObjectID      `bson:"user" json:"user"`
	LabType          string             `bson:"labType" json:"labType"`
	LabName          string             `bson:"labName" json:"labName"`
	Description      string             `bson:"description,omitempty" json:"description,omitempty"`
	Difficulty       string             `bson:"difficulty" json:"difficulty"`
	Status           string             `bson:"status" json:"status"`
	StatusHistory    []StatusHistoryEntry `bson:"statusHistory,omitempty" json:"statusHistory,omitempty"`

	// Docker container information (Phase 1.2)
	ContainerID  string `bson:"containerId,omitempty" json:"containerId,omitempty"`
	DockerImage  string `bson:"dockerImage,omitempty" json:"dockerImage,omitempty"`

	// AWS EC2 Information (Phase 6 — kept for future AWS migration)
	AWSInstanceID      string `bson:"awsInstanceId,omitempty" json:"awsInstanceId,omitempty"`
	AWSInstanceType    string `bson:"awsInstanceType" json:"awsInstanceType"`
	AWSAmiID           string `bson:"awsAmiId,omitempty" json:"awsAmiId,omitempty"`
	AWSSecurityGroupID string `bson:"awsSecurityGroupId,omitempty" json:"awsSecurityGroupId,omitempty"`
	AWSSubnetID        string `bson:"awsSubnetId,omitempty" json:"awsSubnetId,omitempty"`
	AWSRegion          string `bson:"awsRegion" json:"awsRegion"`

	// Connection Details
	PublicIP          string            `bson:"publicIp,omitempty" json:"publicIp,omitempty"`
	PrivateIP         string            `bson:"privateIp,omitempty" json:"privateIp,omitempty"`
	SSHKeyName        string            `bson:"sshKeyName,omitempty" json:"sshKeyName,omitempty"`
	AccessCredentials AccessCredentials `bson:"accessCredentials,omitempty" json:"accessCredentials,omitempty"`

	// Time Tracking
	StartTime           *time.Time `bson:"startTime,omitempty" json:"startTime,omitempty"`
	EndTime             *time.Time `bson:"endTime,omitempty" json:"endTime,omitempty"`
	TotalBillableMinutes int       `bson:"totalBillableMinutes" json:"totalBillableMinutes"`
	MaxDuration         int        `bson:"maxDuration" json:"maxDuration"` // in minutes
	AutoTerminateAt     *time.Time `bson:"autoTerminateAt,omitempty" json:"autoTerminateAt,omitempty"`
	WarningNotificationSent bool   `bson:"warningNotificationSent" json:"warningNotificationSent"`

	// Cost Tracking
	HourlyRate    float64  `bson:"hourlyRate" json:"hourlyRate"`
	EstimatedCost float64  `bson:"estimatedCost" json:"estimatedCost"`
	FinalCost     *float64 `bson:"finalCost,omitempty" json:"finalCost,omitempty"`

	// Progress
	CheckpointsCompleted []Checkpoint     `bson:"checkpointsCompleted,omitempty" json:"checkpointsCompleted,omitempty"`
	FlagsFound           []Flag           `bson:"flagsFound,omitempty" json:"flagsFound,omitempty"`
	Score                int              `bson:"score" json:"score"`

	// Logs and Notes
	ActivityLog []ActivityLogEntry `bson:"activityLog,omitempty" json:"activityLog,omitempty"`
	UserNotes   string             `bson:"userNotes,omitempty" json:"userNotes,omitempty"`

	// Error Information
	ErrorMessage string      `bson:"errorMessage,omitempty" json:"errorMessage,omitempty"`
	ErrorDetails interface{} `bson:"errorDetails,omitempty" json:"errorDetails,omitempty"`

	// Metadata
	Metadata interface{} `bson:"metadata,omitempty" json:"metadata,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// DurationMinutes calculates the session duration in minutes.
func (s *LabSession) DurationMinutes() int {
	if s.StartTime == nil {
		return 0
	}
	endTime := time.Now()
	if s.EndTime != nil {
		endTime = *s.EndTime
	}
	return int(math.Ceil(endTime.Sub(*s.StartTime).Minutes()))
}

// DurationFormatted returns a human-readable duration string.
func (s *LabSession) DurationFormatted() string {
	minutes := s.DurationMinutes()
	hours := minutes / 60
	mins := minutes % 60
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, mins)
	}
	return fmt.Sprintf("%dm", mins)
}

// CurrentCost calculates the real-time cost.
func (s *LabSession) CurrentCost() float64 {
	minutes := float64(s.DurationMinutes())
	hours := minutes / 60.0
	cost := hours * s.HourlyRate
	return math.Round(cost*100) / 100
}

// IsActive returns true if the session is in an active state.
func (s *LabSession) IsActive() bool {
	return s.Status == StatusPending || s.Status == StatusInitializing || s.Status == StatusRunning
}

// ValidStatusTransitions maps current status to allowed next statuses.
var ValidStatusTransitions = map[string][]string{
	StatusPending:      {StatusInitializing, StatusError},
	StatusInitializing: {StatusRunning, StatusError},
	StatusRunning:      {StatusStopping, StatusTerminated, StatusError},
	StatusStopping:     {StatusStopped, StatusError},
	StatusStopped:      {StatusRunning, StatusTerminated},
}

// IsValidTransition checks if a status transition is allowed.
func IsValidTransition(from, to string) bool {
	allowed, exists := ValidStatusTransitions[from]
	if !exists {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
