package domain

import "time"

type Product struct {
	Name        string
	Domain      string
	StripeID    string // Stripe product ID
	PostHogHost string // PostHog host filter for analytics
}

type Metrics struct {
	ProductName string
	Timestamp   time.Time

	// Traffic (PostHog)
	Visits     int64
	Uniques    int64
	BounceRate float64
	// Trend data (store)
	VisitsHistory []int64

	// Revenue (Stripe)
	MRR         int64 // cents
	Subscribers int64

	// Health
	HealthStatus string // "healthy", "degraded", "down"
	ResponseTime int64  // milliseconds
}

type Signal string

const (
	SignalTraction Signal = "traction" // >100 visits/week
	SignalDead     Signal = "dead"     // <10 visits/week, no revenue
	SignalNeutral  Signal = "neutral"
)

func (m *Metrics) ComputeSignal() Signal {
	if m.Visits > 100 {
		return SignalTraction
	}
	if m.Visits < 10 && m.MRR == 0 {
		return SignalDead
	}
	return SignalNeutral
}
