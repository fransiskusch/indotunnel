// Package httpx holds small HTTP helpers shared across handlers.
package httpx

import (
	"encoding/json"
	"net/http"
)

// ErrorBody is the canonical error envelope from the API spec.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail carries a machine code, a human message, and optional details.
type ErrorDetail struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details"`
}

// WriteError writes the canonical error JSON with the given status.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorBody{Error: ErrorDetail{
		Code:    code,
		Message: message,
		Details: map[string]any{},
	}})
}
