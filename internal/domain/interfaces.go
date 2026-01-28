package domain

import (
	"context"
	"time"
)

type AnalyticsProvider interface {
	GetPageviews(ctx context.Context, host string, from, to time.Time) (*AnalyticsData, error)
}

type RevenueProvider interface {
	GetMRR(ctx context.Context, productID string) (mrr int64, subs int64, err error)
}

type HealthChecker interface {
	Check(ctx context.Context, domain string) (*HealthResult, error)
}

type AnalyticsData struct {
	Pageviews int64
	Visitors  int64
}

type HealthResult struct {
	Status       string
	ResponseTime int64
}
