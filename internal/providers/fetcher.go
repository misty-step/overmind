package providers

import (
	"context"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/phaedrus/overmind/internal/domain"
	"github.com/phaedrus/overmind/internal/store"
)

const trendDays = 7

type MetricsFetcher struct {
	stripe  *StripeClient
	posthog *PostHogClient
	store   *store.Store
}

func NewMetricsFetcher(stripe *StripeClient, posthog *PostHogClient, store *store.Store) *MetricsFetcher {
	return &MetricsFetcher{
		stripe:  stripe,
		posthog: posthog,
		store:   store,
	}
}

func (f *MetricsFetcher) FetchAll(ctx context.Context, products []domain.Product) map[string]*domain.Metrics {
	products = append([]domain.Product(nil), products...)

	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)
	trendStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -(trendDays - 1))

	var mu sync.Mutex
	collected := make(map[string]*domain.Metrics, len(products))

	group, ctx := errgroup.WithContext(ctx)
	for _, p := range products {
		p := p
		group.Go(func() error {
			metric := f.fetchProductMetrics(ctx, p, weekAgo, now, trendStart)
			mu.Lock()
			collected[p.Name] = metric
			mu.Unlock()
			return nil
		})
	}

	// Best-effort wait; individual fetch errors are captured per metric.
	_ = group.Wait()
	return collected
}

func (f *MetricsFetcher) fetchProductMetrics(ctx context.Context, p domain.Product, weekAgo, now, trendStart time.Time) *domain.Metrics {
	metric := &domain.Metrics{
		ProductName: p.Name,
		Timestamp:   now,
	}

	if p.PostHogHost != "" && f.posthog != nil {
		if analytics, err := f.posthog.GetPageviews(ctx, p.PostHogHost, weekAgo, now); err == nil {
			metric.Visits = analytics.Pageviews
			metric.Uniques = analytics.Visitors
		} else {
			metric.Errors = append(metric.Errors, "PostHog: "+err.Error())
		}
	}

	if p.StripeID != "" && f.stripe != nil {
		if mrr, subs, err := f.stripe.GetMRRForProduct(ctx, p.StripeID); err == nil {
			metric.MRR = mrr
			metric.Subscribers = subs
		} else {
			metric.Errors = append(metric.Errors, "Stripe: "+err.Error())
		}
	}

	if p.Domain != "" {
		if health, err := CheckHealth(ctx, p.Domain); err == nil {
			metric.HealthStatus = health.Status
			metric.ResponseTime = health.ResponseTime
		} else {
			metric.Errors = append(metric.Errors, "Health: "+err.Error())
		}
	}

	if f.store != nil {
		// Best-effort cache write; live metrics should still surface even if storage fails.
		_ = f.store.SaveMetrics(ctx, metric)
		if history, err := f.store.GetMetricsRange(ctx, p.Name, trendStart, now); err == nil {
			metric.VisitsHistory = buildVisitsHistory(history, now, trendDays)
		}
	}

	return metric
}

func buildVisitsHistory(metrics []*domain.Metrics, now time.Time, days int) []int64 {
	if days <= 0 {
		return nil
	}

	loc := now.Location()
	dayVisits := make(map[string]int64, days)
	for _, metric := range metrics {
		if metric == nil {
			continue
		}
		ts := metric.Timestamp.In(loc)
		day := time.Date(ts.Year(), ts.Month(), ts.Day(), 0, 0, 0, 0, loc)
		dayVisits[day.Format("2006-01-02")] = metric.Visits
	}

	history := make([]int64, 0, days)
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, -(days - 1))
	for i := 0; i < days; i++ {
		day := start.AddDate(0, 0, i)
		history = append(history, dayVisits[day.Format("2006-01-02")])
	}
	return history
}
