package config

import (
	"reflect"
	"strings"
	"testing"

	"github.com/phaedrus/overmind/internal/domain"
)

func TestExpandEnvValue(t *testing.T) {
	t.Setenv("OVERMIND_TEST_ENV", "expanded")

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "expands env", input: "${OVERMIND_TEST_ENV}", want: "expanded"},
		{name: "missing env returns empty", input: "${MISSING_ENV}", want: ""},
		{name: "plain string", input: "plain", want: "plain"},
		{name: "prefix not expanded", input: "x${OVERMIND_TEST_ENV}", want: "x${OVERMIND_TEST_ENV}"},
		{name: "suffix not expanded", input: "${OVERMIND_TEST_ENV}x", want: "${OVERMIND_TEST_ENV}x"},
		{name: "incomplete syntax", input: "${OVERMIND_TEST_ENV", want: "${OVERMIND_TEST_ENV"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := expandEnvValue(tt.input)
			if got != tt.want {
				t.Errorf("expandEnvValue(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name    string
		cfg     Config
		wantErr string
	}{
		{
			name:    "missing products",
			cfg:     Config{},
			wantErr: "no products defined",
		},
		{
			name: "missing name",
			cfg: Config{
				Products: []ProductConfig{{Domain: "example.com"}},
			},
			wantErr: "products[0] missing name",
		},
		{
			name: "missing domain",
			cfg: Config{
				Products: []ProductConfig{{Name: "App"}},
			},
			wantErr: `product "App" missing domain`,
		},
		{
			name: "valid",
			cfg: Config{
				Products: []ProductConfig{{Name: "App", Domain: "example.com"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateConfig(&tt.cfg)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("validateConfig() error = %v, want nil", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("validateConfig() error = nil, want %q", tt.wantErr)
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("validateConfig() error = %q, want %q", err.Error(), tt.wantErr)
			}
		})
	}
}

func TestValidateCredentials(t *testing.T) {
	tests := []struct {
		name     string
		cfg      Config
		wantErrs []string
	}{
		{
			name: "no stripe product ignores empty creds",
			cfg: Config{
				Products: []ProductConfig{{Name: "App", Domain: "app.com"}},
			},
		},
		{
			name: "stripe product requires secret key",
			cfg: Config{
				Products: []ProductConfig{{Name: "App", Domain: "app.com", Stripe: StripeConfig{ProductID: "prod_1"}}},
			},
			wantErrs: []string{"missing stripe secret_key; required because a product has stripe product_id"},
		},
		{
			name: "posthog product requires api key and project id",
			cfg: Config{
				Products: []ProductConfig{{Name: "App", Domain: "app.com", PostHog: PostHogConfig{HostFilter: "app.com"}}},
			},
			wantErrs: []string{"missing posthog api_key; required because a product has posthog host_filter", "missing posthog project_id; required because a product has posthog host_filter"},
		},
		{
			name: "stripe and posthog with creds ok",
			cfg: Config{
				Products: []ProductConfig{{
					Name:   "App",
					Domain: "app.com",
					Stripe: StripeConfig{ProductID: "prod_1"},
					PostHog: PostHogConfig{
						HostFilter: "app.com",
					},
				}},
				Credentials: CredentialsConfig{
					Stripe:  StripeCredentials{SecretKey: "sk_test"},
					PostHog: PostHogCredentials{APIKey: "ph_test", ProjectID: "123"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateCredentials(&tt.cfg)
			if len(tt.wantErrs) == 0 {
				if err != nil {
					t.Fatalf("validateCredentials() error = %v, want nil", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("validateCredentials() error = nil, want %v", tt.wantErrs)
			}
			for _, want := range tt.wantErrs {
				if !strings.Contains(err.Error(), want) {
					t.Fatalf("validateCredentials() error = %q, want %q", err.Error(), want)
				}
			}
		})
	}
}

func TestToProducts(t *testing.T) {
	cfg := Config{
		Products: []ProductConfig{
			{
				Name:   "App",
				Domain: "app.com",
				Stripe: StripeConfig{ProductID: "prod_1"},
				PostHog: PostHogConfig{
					HostFilter: "app.com",
				},
			},
			{
				Name:   "Tool",
				Domain: "tool.com",
			},
		},
	}

	got := cfg.ToProducts()
	want := []domain.Product{
		{
			Name:        "App",
			Domain:      "app.com",
			StripeID:    "prod_1",
			PostHogHost: "app.com",
		},
		{
			Name:   "Tool",
			Domain: "tool.com",
		},
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ToProducts() = %#v, want %#v", got, want)
	}
}
