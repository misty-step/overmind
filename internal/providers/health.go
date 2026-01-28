package providers

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

type HealthResult struct {
	Status       string // "healthy", "degraded", "down"
	ResponseTime int64  // milliseconds
	StatusCode   int
}

// CheckHealth performs an HTTP GET to the domain and returns health status.
func CheckHealth(ctx context.Context, domain string) (*HealthResult, error) {
	if domain == "" {
		return nil, fmt.Errorf("health: domain is empty")
	}

	client := &http.Client{Timeout: 5 * time.Second}
	url := "https://" + domain

	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("health: build request: %w", err)
	}

	resp, err := client.Do(req)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		// Network errors (DNS failure, timeout, connection refused) mean the site is down.
		// Return nil error because "down" is a valid health check result, not an error condition.
		return &HealthResult{
			Status:       "down",
			ResponseTime: elapsed,
			StatusCode:   0,
		}, nil
	}
	defer resp.Body.Close()

	var status string
	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 400:
		status = "healthy"
	case resp.StatusCode >= 400 && resp.StatusCode < 500:
		status = "degraded"
	default:
		status = "down"
	}

	return &HealthResult{
		Status:       status,
		ResponseTime: elapsed,
		StatusCode:   resp.StatusCode,
	}, nil
}
