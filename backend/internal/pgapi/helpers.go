package pgapi

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgconn"
	"crypto/sha256"
)

func writeErr(c *gin.Context, code int, message string) {
	c.AbortWithStatusJSON(code, gin.H{
		"success": false,
		"message": message,
	})
}

func hashSHA256(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}

func parseInt64Param(c *gin.Context, name string) (int64, bool) {
	v := strings.TrimSpace(c.Param(name))
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		writeErr(c, http.StatusBadRequest, "Invalid parameter: "+name)
		return 0, false
	}
	return n, true
}

func pgUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func parseJSONStringArray(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil {
		return []string{}
	}
	return out
}

func parseJSONMap(raw []byte) map[string]interface{} {
	out := map[string]interface{}{}
	if len(raw) == 0 {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	return out
}

func marshalJSON(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func connectionHost(info interface{}) string {
	var m map[string]interface{}
	switch v := info.(type) {
	case map[string]interface{}:
		m = v
	case nil:
		return ""
	default:
		return ""
	}

	if v, ok := m["ip"].(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	if v, ok := m["host"].(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return ""
}