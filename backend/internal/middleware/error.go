package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
)

// ApiError is a custom error type with HTTP status code.
type ApiError struct {
	StatusCode int
	Message    string
	Errors     interface{}
}

func (e *ApiError) Error() string {
	return e.Message
}

// NewApiError creates a new ApiError.
func NewApiError(message string, statusCode int) *ApiError {
	return &ApiError{
		StatusCode: statusCode,
		Message:    message,
	}
}

// ErrorHandler is a global error handling middleware for Gin.
func ErrorHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err
			statusCode := http.StatusInternalServerError
			message := "Internal Server Error"
			var errors interface{}

			// Check for ApiError
			if apiErr, ok := err.(*ApiError); ok {
				statusCode = apiErr.StatusCode
				message = apiErr.Message
				errors = apiErr.Errors
			}

			if cfg.NodeEnv == "development" {
				log.Printf("❌ Error: %v", err)
			}

			response := gin.H{
				"success": false,
				"message": message,
			}
			if errors != nil {
				response["errors"] = errors
			}
			if cfg.NodeEnv == "development" {
				response["stack"] = err.Error()
			}

			c.JSON(statusCode, response)
		}
	}
}

// NotFound handles 404 routes.
func NotFound() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Not Found - " + c.Request.URL.Path,
		})
	}
}

// AbortWithError is a helper to abort with an ApiError.
func AbortWithError(c *gin.Context, statusCode int, message string) {
	c.AbortWithStatusJSON(statusCode, gin.H{
		"success": false,
		"message": message,
	})
}
