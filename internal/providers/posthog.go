package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// escapeHogQLLike escapes special characters for ClickHouse LIKE clauses.
// Order matters: backslash first, then the wildcards.
func escapeHogQLLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

type PostHogClient struct {
	apiKey    string
	projectID string
	host      string
	client    *http.Client
}

func NewPostHogClient(apiKey, projectID, host string) *PostHogClient {
	if host == "" {
		host = "https://us.i.posthog.com"
	}
	return &PostHogClient{
		apiKey:    apiKey,
		projectID: projectID,
		host:      host,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

type PostHogAnalytics struct {
	Pageviews int64
	Visitors  int64
}

// GetPageviews queries PostHog for pageview counts using HogQL
func (c *PostHogClient) GetPageviews(ctx context.Context, hostFilter string, from, to time.Time) (*PostHogAnalytics, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("posthog: api key is empty")
	}

	// HogQL query for pageviews and unique visitors
	// Escape hostFilter to prevent LIKE injection (wildcards: %, _, \)
	safeHost := escapeHogQLLike(hostFilter)
	query := map[string]interface{}{
		"kind": "HogQLQuery",
		"query": fmt.Sprintf(`
			SELECT
				count() as pageviews,
				count(DISTINCT distinct_id) as visitors
			FROM events
			WHERE event = '$pageview'
			AND properties.$host LIKE '%%%s%%'
			AND timestamp >= toDateTime('%s')
			AND timestamp <= toDateTime('%s')
		`, safeHost, from.UTC().Format("2006-01-02 15:04:05"), to.UTC().Format("2006-01-02 15:04:05")),
	}

	body, err := json.Marshal(map[string]interface{}{"query": query})
	if err != nil {
		return nil, fmt.Errorf("posthog: marshal query: %w", err)
	}

	endpoint := fmt.Sprintf("%s/api/projects/%s/query/", c.host, c.projectID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("posthog: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("posthog: query: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		return nil, fmt.Errorf("posthog: query failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Results [][]interface{} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("posthog: decode response: %w", err)
	}

	analytics := &PostHogAnalytics{}
	if len(result.Results) > 0 && len(result.Results[0]) >= 2 {
		if v, ok := result.Results[0][0].(float64); ok {
			analytics.Pageviews = int64(v)
		}
		if v, ok := result.Results[0][1].(float64); ok {
			analytics.Visitors = int64(v)
		}
	}

	return analytics, nil
}
