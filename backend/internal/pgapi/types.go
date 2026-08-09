package pgapi

import "time"

const (
	roleStudent    = "STUDENT"
	roleInstructor = "INSTRUCTOR"
	roleAdmin      = "ADMIN"
)

// AuthUser is the authenticated principal attached to request context.
type AuthUser struct {
	ID                int64
	Username          string
	Email             string
	Role              string
	FirstName         string
	LastName          string
	IsActive          bool
	PasswordChangedAt *time.Time
	TotalLabTime      int64
	TotalSpent        float64
}

// LabSessionView is the API response model for lab session reads.
type LabSessionView struct {
	ID                int64       `json:"id"`
	UserID            int64       `json:"user_id"`
	RoomID            *int64      `json:"room_id,omitempty"`
	TaskID            *int64      `json:"task_id,omitempty"`
	Status            string      `json:"status"`
	StartedAt         *time.Time  `json:"started_at,omitempty"`
	ExpiresAt         *time.Time  `json:"expires_at,omitempty"`
	NetworkName       string      `json:"network_name,omitempty"`
	TargetContainerID string      `json:"target_container_id,omitempty"`
	AttackContainerID string      `json:"attack_container_id,omitempty"`
	ConnectionInfo    interface{} `json:"connection_info_json"`
}
