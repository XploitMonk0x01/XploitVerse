package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"golang.org/x/crypto/bcrypt"
)

// User roles for XploitVerse Platform.
const (
	RoleStudent    = "STUDENT"
	RoleInstructor = "INSTRUCTOR"
	RoleAdmin      = "ADMIN"
)

// Notifications holds user notification preferences.
type Notifications struct {
	Email bool `bson:"email" json:"email"`
	InApp bool `bson:"inApp" json:"inApp"`
}

// Preferences holds user display/notification preferences.
type Preferences struct {
	Theme         string        `bson:"theme" json:"theme"`
	Notifications Notifications `bson:"notifications" json:"notifications"`
}

// User represents a platform user in MongoDB.
type User struct {
	ID                  bson.ObjectID  `bson:"_id,omitempty" json:"id"`
	Username            string         `bson:"username" json:"username"`
	Email               string         `bson:"email" json:"email"`
	Password            string         `bson:"password,omitempty" json:"-"`
	Role                string         `bson:"role" json:"role"`
	FirstName           string         `bson:"firstName,omitempty" json:"firstName,omitempty"`
	LastName            string         `bson:"lastName,omitempty" json:"lastName,omitempty"`
	Avatar              *string        `bson:"avatar,omitempty" json:"avatar,omitempty"`
	IsActive            bool           `bson:"isActive" json:"isActive"`
	IsEmailVerified     bool           `bson:"isEmailVerified" json:"isEmailVerified"`
	LastLogin           *time.Time     `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	PasswordChangedAt   *time.Time     `bson:"passwordChangedAt,omitempty" json:"-"`
	PasswordResetToken  string         `bson:"passwordResetToken,omitempty" json:"-"`
	PasswordResetExpires *time.Time    `bson:"passwordResetExpires,omitempty" json:"-"`
	TotalLabTime        int            `bson:"totalLabTime" json:"totalLabTime"`
	TotalSpent          float64        `bson:"totalSpent" json:"totalSpent"`
	Preferences         Preferences    `bson:"preferences" json:"preferences"`
	CreatedAt           time.Time      `bson:"createdAt" json:"createdAt"`
	UpdatedAt           time.Time      `bson:"updatedAt" json:"updatedAt"`
}

// FullName returns the display name.
func (u *User) FullName() string {
	if u.FirstName != "" && u.LastName != "" {
		return u.FirstName + " " + u.LastName
	}
	return u.Username
}

// HashPassword hashes the user's password with bcrypt.
func (u *User) HashPassword() error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
	if err != nil {
		return err
	}
	u.Password = string(hashed)
	return nil
}

// ComparePassword checks a candidate password against the stored hash.
func (u *User) ComparePassword(candidate string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(candidate))
	return err == nil
}

// ChangedPasswordAfter checks if the password was changed after the JWT was issued.
func (u *User) ChangedPasswordAfter(jwtIssuedAt int64) bool {
	if u.PasswordChangedAt != nil {
		return u.PasswordChangedAt.Unix() > jwtIssuedAt
	}
	return false
}

// DefaultPreferences returns default user preferences.
func DefaultPreferences() Preferences {
	return Preferences{
		Theme: "dark",
		Notifications: Notifications{
			Email: true,
			InApp: true,
		},
	}
}
