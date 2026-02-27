package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"math/rand"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// ChatHandler holds dependencies for chat endpoints.
type ChatHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

// Mock AI responses for when no API key is available.
var mockResponses = map[string][]string{
	"sql_injection": {
		"I see you're working on SQL Injection! Have you tried using a basic payload like `' OR 1=1 --`? This can bypass simple authentication.",
		"Remember, SQL injection vulnerabilities often occur when user input is directly concatenated into SQL queries. Look for login forms or search functionality.",
		"Try using `UNION SELECT` to extract data from other tables. First, determine the number of columns with `ORDER BY` clauses.",
		"Tools like SQLMap can automate the exploitation process. Try: `sqlmap -u 'http://target/page?id=1' --dbs`",
		"Don't forget to check for blind SQL injection - sometimes the results aren't directly visible but can be inferred from response times.",
	},
	"xss": {
		"Cross-Site Scripting (XSS) requires finding input fields that reflect your data back. Try `<script>alert('XSS')</script>`",
		"If basic script tags are filtered, try alternatives like `<img src=x onerror=alert(1)>` or `<svg onload=alert(1)>`",
		"Check for stored XSS in comment sections, profile fields, or anywhere user content is displayed to others.",
		"DOM-based XSS occurs in client-side code. Check the JavaScript for dangerous sinks like `innerHTML` or `eval()`.",
		"Use Burp Suite's scanner to identify potential XSS injection points automatically.",
	},
	"privilege_escalation": {
		"For Linux privilege escalation, start with `sudo -l` to see what commands you can run as root.",
		"Check for SUID binaries with `find / -perm -4000 2>/dev/null`. These can often be exploited for root access.",
		"Look for credentials in config files, `.bash_history`, or environment variables.",
		"LinPEAS is an excellent enumeration script. Run it to discover potential privilege escalation vectors.",
		"Check for vulnerable kernel versions with `uname -a` and search for known exploits on exploit-db.",
	},
	"network": {
		"Start with reconnaissance! Use `nmap -sC -sV target` to discover services and versions.",
		"For network traffic analysis, use Wireshark filters like `http.request.method == POST` to find interesting traffic.",
		"Check for open ports that might have default credentials - databases, admin panels, etc.",
		"Use `netstat -tuln` to see what services are listening on the local machine.",
		"ARP spoofing with tools like arpspoof can help intercept traffic in a local network.",
	},
	"default": {
		"I'm your AI Mentor! I'm here to guide you through this cybersecurity challenge. What specific aspect are you stuck on?",
		"Remember the methodology: Reconnaissance → Scanning → Exploitation → Post-Exploitation → Reporting.",
		"Take notes as you go! Documentation is crucial in penetration testing.",
		"If you're stuck, try to think like the developer who built the vulnerable system. What mistakes might they have made?",
		"The 'OWASP Top 10' is a great reference for web application vulnerabilities. Review it for common attack vectors.",
	},
}

// labContext holds context about the current lab for AI prompts.
type labContext struct {
	LabName    string   `json:"labName"`
	Category   string   `json:"category"`
	Difficulty string   `json:"difficulty"`
	Objectives []string `json:"objectives,omitempty"`
	Tools      []string `json:"tools,omitempty"`
	Description string  `json:"description,omitempty"`
}

func (h *ChatHandler) getLabContext(c *gin.Context, sessionID, labID string) *labContext {
	if labID != "" {
		objID, err := bson.ObjectIDFromHex(labID)
		if err == nil {
			var lab models.Lab
			if err := h.DB.Collection("labs").FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&lab); err == nil {
				return &labContext{
					LabName:     lab.Title,
					Category:    lab.Category,
					Difficulty:  lab.Difficulty,
					Objectives:  lab.Objectives,
					Tools:       lab.Tools,
					Description: lab.Description,
				}
			}
		}
	}
	return nil
}

func generateSystemPrompt(ctx *labContext) string {
	base := `You are a Cybersecurity Mentor and ethical hacking instructor for XploitVerse, an interactive cybersecurity training platform. Your role is to guide students through hands-on security challenges while teaching them important concepts.

IMPORTANT RULES:
1. NEVER solve the challenge for the student - provide hints and guidance only
2. Explain concepts clearly and encourage learning
3. If they seem stuck, break down the problem into smaller steps
4. Emphasize ethical hacking principles and legal considerations
5. Suggest relevant tools and techniques without giving away the exact solution
6. Be encouraging and supportive`

	if ctx != nil {
		base += "\n\nCURRENT LAB CONTEXT:\n"
		base += "- Lab Name: " + ctx.LabName + "\n"
		base += "- Category: " + ctx.Category + "\n"
		base += "- Difficulty: " + ctx.Difficulty + "\n"
		base += "- Description: " + ctx.Description + "\n"
		if len(ctx.Objectives) > 0 {
			base += "- Objectives:\n  " + strings.Join(ctx.Objectives, "\n  ") + "\n"
		}
		if len(ctx.Tools) > 0 {
			base += "- Available Tools: " + strings.Join(ctx.Tools, ", ") + "\n"
		}
		base += "\nTailor your responses to this specific lab challenge."
	}

	return base
}

func getMockResponse(ctx *labContext, userMessage string) string {
	category := "default"

	if ctx != nil {
		cat := strings.ToLower(ctx.Category)
		switch {
		case strings.Contains(cat, "sql") || strings.Contains(cat, "injection"):
			category = "sql_injection"
		case strings.Contains(cat, "xss") || strings.Contains(cat, "cross-site"):
			category = "xss"
		case strings.Contains(cat, "privilege") || strings.Contains(cat, "escalation"):
			category = "privilege_escalation"
		case strings.Contains(cat, "network") || strings.Contains(cat, "traffic"):
			category = "network"
		}
	}

	msg := strings.ToLower(userMessage)
	switch {
	case strings.Contains(msg, "sql") || strings.Contains(msg, "injection") || strings.Contains(msg, "database"):
		category = "sql_injection"
	case strings.Contains(msg, "xss") || strings.Contains(msg, "script") || strings.Contains(msg, "cross-site"):
		category = "xss"
	case strings.Contains(msg, "privilege") || strings.Contains(msg, "root") || strings.Contains(msg, "admin"):
		category = "privilege_escalation"
	case strings.Contains(msg, "nmap") || strings.Contains(msg, "network") || strings.Contains(msg, "port"):
		category = "network"
	}

	responses := mockResponses[category]
	return responses[rand.Intn(len(responses))]
}

func callOpenAI(apiKey, systemPrompt, userMessage string, conversationHistory []map[string]string) (string, error) {
	messages := []map[string]string{
		{"role": "system", "content": systemPrompt},
	}
	messages = append(messages, conversationHistory...)
	messages = append(messages, map[string]string{"role": "user", "content": userMessage})

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model":      "gpt-3.5-turbo",
		"messages":   messages,
		"max_tokens": 500,
		"temperature": 0.7,
	})

	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	json.Unmarshal(body, &result)

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}
	return "", nil
}

func callAnthropic(apiKey, systemPrompt, userMessage string, conversationHistory []map[string]string) (string, error) {
	messages := make([]map[string]string, 0)
	for _, msg := range conversationHistory {
		role := msg["role"]
		if role != "assistant" {
			role = "user"
		}
		messages = append(messages, map[string]string{"role": role, "content": msg["content"]})
	}
	messages = append(messages, map[string]string{"role": "user", "content": userMessage})

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model":      "claude-3-haiku-20240307",
		"max_tokens": 500,
		"system":     systemPrompt,
		"messages":   messages,
	})

	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	json.Unmarshal(body, &result)

	if len(result.Content) > 0 {
		return result.Content[0].Text, nil
	}
	return "", nil
}

// Chat handles POST /api/chat.
func (h *ChatHandler) Chat(c *gin.Context) {
	var body struct {
		Message             string              `json:"message" binding:"required"`
		SessionID           string              `json:"sessionId"`
		LabID               string              `json:"labId"`
		ConversationHistory []map[string]string `json:"conversationHistory"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Message is required")
		return
	}

	if strings.TrimSpace(body.Message) == "" {
		middleware.AbortWithError(c, http.StatusBadRequest, "Message is required")
		return
	}

	ctx := h.getLabContext(c, body.SessionID, body.LabID)
	systemPrompt := generateSystemPrompt(ctx)

	var aiResponse string
	provider := "mock"

	if h.Cfg.AI.OpenAIKey != "" {
		resp, err := callOpenAI(h.Cfg.AI.OpenAIKey, systemPrompt, body.Message, body.ConversationHistory)
		if err == nil && resp != "" {
			aiResponse = resp
			provider = "openai"
		}
	}

	if aiResponse == "" && h.Cfg.AI.AnthropicKey != "" {
		resp, err := callAnthropic(h.Cfg.AI.AnthropicKey, systemPrompt, body.Message, body.ConversationHistory)
		if err == nil && resp != "" {
			aiResponse = resp
			provider = "anthropic"
		}
	}

	if aiResponse == "" {
		aiResponse = getMockResponse(ctx, body.Message)
		provider = "mock"
	}

	response := gin.H{
		"success": true,
		"data": gin.H{
			"response": aiResponse,
			"provider": provider,
		},
	}

	if ctx != nil {
		response["data"].(gin.H)["labContext"] = gin.H{
			"labName":  ctx.LabName,
			"category": ctx.Category,
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetSuggestions handles GET /api/chat/suggestions.
func (h *ChatHandler) GetSuggestions(c *gin.Context) {
	sessionID := c.Query("sessionId")
	labID := c.Query("labId")

	ctx := h.getLabContext(c, sessionID, labID)

	suggestions := []string{
		"What should I try first?",
		"Can you explain the vulnerability type?",
		"What tools should I use?",
		"I'm stuck, can you give me a hint?",
		"How do I approach this challenge?",
	}

	if ctx != nil {
		categorySpecific := map[string][]string{
			"Red Team": {
				"How do I enumerate this target?",
				"What's the best exploitation technique?",
				"How can I maintain persistence?",
			},
			"Blue Team": {
				"What indicators should I look for?",
				"How do I analyze this log file?",
				"What's the best detection strategy?",
			},
		}

		if additional, ok := categorySpecific[ctx.Category]; ok {
			suggestions = append(suggestions, additional...)
		}
	}

	if len(suggestions) > 6 {
		suggestions = suggestions[:6]
	}

	response := gin.H{
		"success": true,
		"data": gin.H{
			"suggestions": suggestions,
		},
	}

	if ctx != nil {
		response["data"].(gin.H)["labContext"] = gin.H{
			"labName":  ctx.LabName,
			"category": ctx.Category,
		}
	}

	c.JSON(http.StatusOK, response)
}
