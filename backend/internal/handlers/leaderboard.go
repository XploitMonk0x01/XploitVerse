package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// LeaderboardHandler serves leaderboard endpoints.
type LeaderboardHandler struct {
	DB       *mongo.Database
	Cfg      *config.Config
	cache    []leaderboardEntry
	cachedAt time.Time
}

type leaderboardEntry struct {
	Rank           int    `json:"rank"`
	UserID         string `json:"userId"`
	Username       string `json:"username"`
	TotalPoints    int    `json:"totalPoints"`
	TasksCompleted int    `json:"tasksCompleted"`
}

// refreshCache rebuilds the top-100 leaderboard from MongoDB.
func (h *LeaderboardHandler) refreshCache(ctx context.Context) error {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"completedAt": bson.M{"$ne": nil}}}},
		{{Key: "$group", Value: bson.M{
			"_id":            "$userId",
			"totalPoints":    bson.M{"$sum": "$pointsEarned"},
			"tasksCompleted": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{
			{Key: "totalPoints", Value: -1},
			{Key: "tasksCompleted", Value: -1},
		}}},
		{{Key: "$limit", Value: 100}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "_id",
			"foreignField": "_id",
			"as":           "user",
		}}},
		{{Key: "$unwind", Value: bson.M{
			"path":                       "$user",
			"preserveNullAndEmptyArrays": true,
		}}},
		{{Key: "$project", Value: bson.M{
			"userId":         "$_id",
			"username":       "$user.username",
			"totalPoints":    1,
			"tasksCompleted": 1,
		}}},
	}

	cursor, err := h.DB.Collection("user_task_progress").Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	type rawEntry struct {
		UserID         bson.ObjectID `bson:"userId"`
		Username       string        `bson:"username"`
		TotalPoints    int           `bson:"totalPoints"`
		TasksCompleted int           `bson:"tasksCompleted"`
	}

	var rows []rawEntry
	if err := cursor.All(ctx, &rows); err != nil {
		return err
	}

	entries := make([]leaderboardEntry, len(rows))
	for i, r := range rows {
		entries[i] = leaderboardEntry{
			Rank:           i + 1,
			UserID:         r.UserID.Hex(),
			Username:       r.Username,
			TotalPoints:    r.TotalPoints,
			TasksCompleted: r.TasksCompleted,
		}
	}

	h.cache = entries
	h.cachedAt = time.Now()
	return nil
}

func (h *LeaderboardHandler) ensureCache(ctx context.Context) error {
	if time.Since(h.cachedAt) < 5*time.Minute && len(h.cache) > 0 {
		return nil
	}
	return h.refreshCache(ctx)
}

// GetLeaderboard handles GET /api/leaderboard
func (h *LeaderboardHandler) GetLeaderboard(c *gin.Context) {
	if err := h.ensureCache(c.Request.Context()); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Leaderboard aggregation failed")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"leaderboard": h.cache, "cachedAt": h.cachedAt},
	})
}

// GetMyRank handles GET /api/leaderboard/me
func (h *LeaderboardHandler) GetMyRank(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	if err := h.ensureCache(c.Request.Context()); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Leaderboard aggregation failed")
		return
	}

	userHex := user.ID.Hex()
	for _, e := range h.cache {
		if e.UserID == userHex {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    gin.H{"entry": e, "total": len(h.cache)},
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"entry": leaderboardEntry{
				Rank:     -1,
				UserID:   userHex,
				Username: user.Username,
			},
			"total": len(h.cache),
		},
	})
}
