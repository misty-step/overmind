package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const stripeBaseURL = "https://api.stripe.com/v1"

type StripeClient struct {
	secretKey  string
	httpClient *http.Client
}

func NewStripeClient(secretKey string) *StripeClient {
	return &StripeClient{
		secretKey:  secretKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type stripeSubscriptionList struct {
	Data    []stripeSubscription `json:"data"`
	HasMore bool                 `json:"has_more"`
}

type stripeSubscription struct {
	ID    string                  `json:"id"`
	Items stripeSubscriptionItems `json:"items"`
}

type stripeSubscriptionItems struct {
	Data []stripeSubscriptionItem `json:"data"`
}

type stripeSubscriptionItem struct {
	Price    stripePrice `json:"price"`
	Quantity *int64      `json:"quantity"`
}

type stripePrice struct {
	Product    string                `json:"product"`
	UnitAmount *int64                `json:"unit_amount"`
	Recurring  *stripePriceRecurring `json:"recurring"`
}

type stripePriceRecurring struct {
	Interval string `json:"interval"` // day, week, month, year
}

// GetMRRForProduct returns MRR in cents and active subscriber count for a Stripe product.
func (c *StripeClient) GetMRRForProduct(ctx context.Context, productID string) (int64, int64, error) {
	if productID == "" {
		return 0, 0, fmt.Errorf("stripe: product id is empty")
	}

	var (
		mrr           int64
		startingAfter string
		subscribers   = make(map[string]struct{})
	)

	for {
		params := url.Values{}
		params.Set("status", "active")
		params.Set("limit", "100")
		params.Add("expand[]", "data.items.data.price")
		if startingAfter != "" {
			params.Set("starting_after", startingAfter)
		}

		endpoint := stripeBaseURL + "/subscriptions?" + params.Encode()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return 0, 0, fmt.Errorf("stripe: build request: %w", err)
		}
		req.SetBasicAuth(c.secretKey, "")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return 0, 0, fmt.Errorf("stripe: list subscriptions: %w", err)
		}

		if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
			_ = resp.Body.Close()
			return 0, 0, fmt.Errorf("stripe: list subscriptions: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
		}

		var list stripeSubscriptionList
		if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
			_ = resp.Body.Close()
			return 0, 0, fmt.Errorf("stripe: decode subscriptions: %w", err)
		}
		_ = resp.Body.Close()

		for _, sub := range list.Data {
			matched := false
			for _, item := range sub.Items.Data {
				if item.Price.Product != productID {
					continue
				}
				if item.Price.UnitAmount == nil {
					continue
				}

				// Quantity defaults to 1 if not set
				qty := int64(1)
				if item.Quantity != nil {
					qty = *item.Quantity
				}

				// Calculate line item amount
				amount := *item.Price.UnitAmount * qty

				// Normalize to monthly based on billing interval
				if item.Price.Recurring != nil {
					switch item.Price.Recurring.Interval {
					case "year":
						amount = amount / 12
					case "quarter":
						amount = amount / 3
					case "week":
						amount = amount * 52 / 12
					case "day":
						amount = amount * 365 / 12
						// "month" is already monthly, no change needed
					}
				}

				mrr += amount
				matched = true
			}
			if matched {
				subscribers[sub.ID] = struct{}{}
			}
		}

		if !list.HasMore {
			break
		}
		if len(list.Data) == 0 {
			return mrr, int64(len(subscribers)), fmt.Errorf("stripe: pagination returned empty page")
		}
		startingAfter = list.Data[len(list.Data)-1].ID
		if startingAfter == "" {
			return mrr, int64(len(subscribers)), fmt.Errorf("stripe: pagination missing last id")
		}
	}

	return mrr, int64(len(subscribers)), nil
}
