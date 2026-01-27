package providers

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
