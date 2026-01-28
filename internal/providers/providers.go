package providers

import "github.com/phaedrus/overmind/internal/store"

type Providers struct {
	Stripe  *StripeClient
	PostHog *PostHogClient
}

func New(stripeKey, posthogKey, posthogProjectID, posthogHost string) *Providers {
	return &Providers{
		Stripe:  NewStripeClient(stripeKey),
		PostHog: NewPostHogClient(posthogKey, posthogProjectID, posthogHost),
	}
}

func (p *Providers) NewMetricsFetcher(s *store.Store) *MetricsFetcher {
	if p == nil {
		return NewMetricsFetcher(nil, nil, s)
	}
	return NewMetricsFetcher(p.Stripe, p.PostHog, s)
}
