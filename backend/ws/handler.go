// Package ws provides a WebSocket-based terminal that bridges the browser to a
// running Docker container via "docker exec".
//
// Flow:
//
//	GET /ws/terminal?sessionId=<id>&token=<jwt>
//	  ↓  JWT auth
//	  ↓  look up LabSession → containerID
//	  ↓  exec "docker exec -i <containerID> /bin/sh"
//	  ↔  pipe WS ↔ subprocess stdin/stdout
package ws

import (
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/xploitverse/backend/internal/config"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var upgrader = websocket.Upgrader{
	HandshakeTimeout: 10 * time.Second,
	ReadBufferSize:   4096,
	WriteBufferSize:  4096,
	// Allow all origins — the auth is handled by JWT, not CORS
	CheckOrigin: func(r *http.Request) bool { return true },
}

// LabSessionDoc is the minimal projection we need from MongoDB.
type LabSessionDoc struct {
	ID          bson.ObjectID `bson:"_id"`
	UserID      bson.ObjectID `bson:"user"`
	ContainerID string        `bson:"containerId"`
	Status      string        `bson:"status"`
}

// TerminalHandler returns a Gin handler for the /ws/terminal endpoint.
func TerminalHandler(db *mongo.Database, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ── 1. Authenticate ────────────────────────────────────────────
		tokenStr := c.Query("token")
		if tokenStr == "" {
			// Fallback: check Authorization header (useful for local testing)
			hdr := c.GetHeader("Authorization")
			tokenStr = strings.TrimPrefix(hdr, "Bearer ")
		}
		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		claims := jwt.MapClaims{}
		parsed, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})
		if err != nil || !parsed.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		userIDStr, _ := claims["id"].(string)
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}
		userObjID, err := bson.ObjectIDFromHex(userIDStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		// ── 2. Load session ────────────────────────────────────────────
		sessionID := c.Query("sessionId")
		if sessionID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sessionId required"})
			return
		}
		sessionObjID, err := bson.ObjectIDFromHex(sessionID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sessionId"})
			return
		}

		ctx := c.Request.Context()
		var session LabSessionDoc
		err = db.Collection("labsessions").FindOne(ctx, bson.M{
			"_id":    sessionObjID,
			"user":   userObjID,
			"status": bson.M{"$in": []string{"running"}},
		}).Decode(&session)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "active session not found"})
			return
		}

		containerID := session.ContainerID
		if containerID == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "container not yet provisioned"})
			return
		}

		// Mock containers (from dev mode) — provide a local shell instead
		isMock := strings.HasPrefix(containerID, "mock_")

		// ── 3. Upgrade to WebSocket ────────────────────────────────────
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade: %v", err)
			return
		}
		defer conn.Close()

		log.Printf("🔌 WS terminal opened: session=%s container=%s", sessionID, containerID)

		// ── 4. Spawn subprocess ────────────────────────────────────────
		var cmd *exec.Cmd
		if isMock {
			// Dev mode: spawn a local shell for testing
			shell := "sh"
			if s := os.Getenv("SHELL"); s != "" {
				shell = s
			}
			// On Windows, fall back to cmd.exe
			if _, err := exec.LookPath(shell); err != nil {
				cmd = exec.Command("cmd.exe")
			} else {
				cmd = exec.Command(shell)
			}
		} else {
			cmd = exec.Command("docker", "exec", "-i", containerID, "/bin/sh")
		}

		subStdin, err := cmd.StdinPipe()
		if err != nil {
			sendError(conn, "failed to create stdin pipe: "+err.Error())
			return
		}
		subStdout, err := cmd.StdoutPipe()
		if err != nil {
			sendError(conn, "failed to create stdout pipe: "+err.Error())
			return
		}
		cmd.Stderr = cmd.Stdout // merge stderr into stdout pipe

		if err := cmd.Start(); err != nil {
			sendError(conn, "failed to start shell: "+err.Error())
			return
		}

		done := make(chan struct{})

		// Subprocess stdout → WebSocket
		go func() {
			defer close(done)
			buf := make([]byte, 4096)
			for {
				n, err := subStdout.Read(buf)
				if n > 0 {
					if writeErr := conn.WriteMessage(websocket.TextMessage, buf[:n]); writeErr != nil {
						break
					}
				}
				if err != nil {
					break
				}
			}
		}()

		// WebSocket → subprocess stdin
		go func() {
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					subStdin.Close()
					cmd.Process.Kill()
					return
				}
				if _, err := io.Writer(subStdin).Write(msg); err != nil {
					return
				}
			}
		}()

		<-done
		cmd.Wait()
		log.Printf("🔌 WS terminal closed: session=%s", sessionID)
	}
}

func sendError(conn *websocket.Conn, msg string) {
	conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mError: "+msg+"\x1b[0m\r\n"))
}
