package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/utils"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Client represents a connected WebSocket client.
type Client struct {
	conn      *websocket.Conn
	userID    string
	sessionID string
	send      chan []byte
}

// Hub manages connected clients.
type Hub struct {
	clients    map[string]*Client
	mu         sync.RWMutex
	db         *mongo.Database
	cfg        *config.Config
}

// NewHub creates a new WebSocket hub.
func NewHub(db *mongo.Database, cfg *config.Config) *Hub {
	return &Hub{
		clients: make(map[string]*Client),
		db:      db,
		cfg:     cfg,
	}
}

// HandleWebSocket handles WebSocket upgrade and connection lifecycle.
func (h *Hub) HandleWebSocket(c *gin.Context) {
	// Authenticate via query param or cookie
	tokenStr := c.Query("token")
	if tokenStr == "" {
		if cookie, err := c.Cookie("jwt"); err == nil {
			tokenStr = cookie
		}
	}

	var userID string
	if tokenStr != "" {
		claims, err := utils.VerifyToken(tokenStr, h.cfg)
		if err == nil {
			userID = claims.ID
		}
	}

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	sessionID := c.Query("sessionId")
	client := &Client{
		conn:      conn,
		userID:    userID,
		sessionID: sessionID,
		send:      make(chan []byte, 256),
	}

	h.mu.Lock()
	h.clients[userID] = client
	h.mu.Unlock()

	log.Printf("🔌 WebSocket connected: user=%s session=%s", userID, sessionID)

	// Send initial connection success
	sendJSON(conn, map[string]interface{}{
		"type":    "connected",
		"message": "Connected to XploitVerse Lab Environment",
		"userId":  userID,
	})

	// Start goroutines
	go h.writePump(client)
	go h.readPump(client)

	// If session provided, start streaming logs
	if sessionID != "" {
		go h.streamBootLogs(client)
	}
}

func (h *Hub) readPump(client *Client) {
	defer func() {
		h.mu.Lock()
		delete(h.clients, client.userID)
		h.mu.Unlock()
		client.conn.Close()
		log.Printf("🔌 WebSocket disconnected: user=%s", client.userID)
	}()

	client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := client.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		if json.Unmarshal(message, &msg) != nil {
			continue
		}

		msgType, _ := msg["type"].(string)

		switch msgType {
		case "command":
			command, _ := msg["command"].(string)
			h.handleCommand(client, command)
		case "ping":
			sendJSON(client.conn, map[string]interface{}{
				"type":      "pong",
				"timestamp": time.Now().UnixMilli(),
			})
		}
	}
}

func (h *Hub) writePump(client *Client) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-client.send:
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			client.conn.WriteMessage(websocket.TextMessage, msg)
		case <-ticker.C:
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) handleCommand(client *Client, command string) {
	responses := map[string]string{
		"whoami":           "root",
		"id":               "uid=0(root) gid=0(root) groups=0(root)",
		"uname -a":         "Linux xploitverse-lab 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux",
		"pwd":              "/root",
		"ls":               "Desktop  Documents  exploit.py  notes.txt  tools",
		"ls -la":           "total 40\ndrwx------  6 root root 4096 Jan 15 10:30 .\ndrwxr-xr-x 20 root root 4096 Jan 15 10:00 ..\n-rwxr-xr-x  1 root root  245 Jan 15 10:30 exploit.py\n-rw-r--r--  1 root root   42 Jan 15 10:30 notes.txt\ndrwxr-xr-x  2 root root 4096 Jan 15 10:30 tools",
		"cat notes.txt":    "Flag format: FLAG{xxxx-xxxx-xxxx}\nGood luck!",
		"ifconfig":         "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 10.0.0.100  netmask 255.255.255.0  broadcast 10.0.0.255",
		"ip addr":          "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>\n    inet 10.0.0.100/24 brd 10.0.0.255 scope global eth0",
		"nmap --version":   "Nmap version 7.94 ( https://nmap.org )",
		"python3 --version": "Python 3.11.6",
	}

	output := "Command not found: " + command
	if resp, ok := responses[strings.TrimSpace(command)]; ok {
		output = resp
	} else if strings.HasPrefix(command, "echo ") {
		output = strings.TrimPrefix(command, "echo ")
	} else if strings.HasPrefix(command, "nmap ") {
		output = fmt.Sprintf("Starting Nmap 7.94 scan...\nScanning target...\n\nPORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n443/tcp  open  https\n3306/tcp open  mysql\n\nNmap done: 1 IP address scanned in %.1f seconds", 2+rand.Float64()*3)
	}

	sendJSON(client.conn, map[string]interface{}{
		"type":      "command_output",
		"command":   command,
		"output":    output,
		"timestamp": time.Now().UnixMilli(),
	})
}

func (h *Hub) streamBootLogs(client *Client) {
	bootLogs := []struct {
		delay   time.Duration
		message string
	}{
		{300 * time.Millisecond, "[    0.000000] Linux version 5.15.0-91-generic (buildd@lcy02-amd64-116)"},
		{200 * time.Millisecond, "[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-5.15.0-91-generic root=/dev/sda1"},
		{150 * time.Millisecond, "[    0.100000] BIOS-provided physical RAM map:"},
		{100 * time.Millisecond, "[    0.200000] Memory: 2048MB available"},
		{200 * time.Millisecond, "[    0.300000] CPU: Intel Xeon E5-2676 v3 @ 2.40GHz"},
		{150 * time.Millisecond, "[    0.500000] Initializing CPU#0"},
		{300 * time.Millisecond, "[    1.000000] NET: Registered PF_INET protocol family"},
		{200 * time.Millisecond, "[    1.200000] IP route cache hash table entries: 4096"},
		{250 * time.Millisecond, "[    1.500000] NET: Registered PF_INET6 protocol family"},
		{200 * time.Millisecond, "[    2.000000] EXT4-fs (sda1): mounted filesystem with ordered data mode"},
		{300 * time.Millisecond, "[    2.500000] systemd[1]: Started Journal Service."},
		{200 * time.Millisecond, "[    3.000000] systemd[1]: Starting Network Service..."},
		{400 * time.Millisecond, "[    3.500000] systemd[1]: Started Network Service."},
		{200 * time.Millisecond, "[    4.000000] systemd[1]: Starting OpenSSH Server..."},
		{300 * time.Millisecond, "[    4.500000] systemd[1]: Started OpenSSH Server."},
		{200 * time.Millisecond, "[    5.000000] systemd[1]: Starting Apache HTTP Server..."},
		{300 * time.Millisecond, "[    5.500000] systemd[1]: Started Apache HTTP Server."},
		{200 * time.Millisecond, "[    6.000000] ✅ Lab environment ready!"},
		{100 * time.Millisecond, "[    6.100000] 🔒 Security tools loaded: nmap, metasploit, burpsuite, sqlmap"},
		{100 * time.Millisecond, "[    6.200000] 🌐 Network interfaces configured"},
		{100 * time.Millisecond, "[    6.300000] 📋 Lab objectives loaded"},
		{500 * time.Millisecond, ""},
		{0, "root@xploitverse-lab:~# Welcome to XploitVerse Lab Environment"},
	}

	for _, entry := range bootLogs {
		if entry.delay > 0 {
			time.Sleep(entry.delay)
		}
		sendJSON(client.conn, map[string]interface{}{
			"type":      "boot_log",
			"message":   entry.message,
			"timestamp": time.Now().UnixMilli(),
		})
	}

	// After boot, stream random activity
	go h.streamActivityLogs(client)
}

func (h *Hub) streamActivityLogs(client *Client) {
	activities := []string{
		"[network] Packet captured: TCP SYN from 192.168.1.105 → 10.0.0.50:80",
		"[system] Process started: /usr/sbin/apache2 (PID 1234)",
		"[auth] Failed login attempt: user=admin from 192.168.1.200",
		"[network] DNS query: suspicious-domain.evil.com from 10.0.0.100",
		"[firewall] Blocked: 192.168.1.150:45678 → 10.0.0.50:22 (brute-force detected)",
		"[system] File modified: /var/www/html/config.php",
		"[network] ARP request: who-has 10.0.0.1 tell 10.0.0.100",
		"[auth] Successful login: user=www-data via SSH from 10.0.0.105",
		"[system] Cron job executed: /etc/cron.d/backup",
		"[network] HTTP request: GET /admin/dashboard HTTP/1.1 → 403 Forbidden",
	}

	for {
		delay := time.Duration(5+rand.Intn(15)) * time.Second
		time.Sleep(delay)

		msg := activities[rand.Intn(len(activities))]
		sendJSON(client.conn, map[string]interface{}{
			"type":      "activity_log",
			"message":   msg,
			"timestamp": time.Now().UnixMilli(),
		})
	}
}

func sendJSON(conn *websocket.Conn, v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	conn.WriteMessage(websocket.TextMessage, data)
}
