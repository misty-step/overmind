package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/phaedrus/overmind/internal/domain"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Products    []ProductConfig   `yaml:"products"`
	Credentials CredentialsConfig `yaml:"credentials"`
}

type ProductConfig struct {
	Name    string        `yaml:"name"`
	Domain  string        `yaml:"domain"`
	Stripe  StripeConfig  `yaml:"stripe,omitempty"`
	PostHog PostHogConfig `yaml:"posthog,omitempty"`
}

type StripeConfig struct {
	ProductID string `yaml:"product_id"`
}

type PostHogConfig struct {
	HostFilter string `yaml:"host_filter"` // e.g., "chrondle.app"
}

type CredentialsConfig struct {
	Stripe  StripeCredentials  `yaml:"stripe"`
	PostHog PostHogCredentials `yaml:"posthog"`
}

type StripeCredentials struct {
	SecretKey string `yaml:"secret_key"`
}

type PostHogCredentials struct {
	APIKey    string `yaml:"api_key"`    // ${POSTHOG_PERSONAL_API_KEY}
	ProjectID string `yaml:"project_id"` // "293836"
	Host      string `yaml:"host"`       // "https://us.i.posthog.com"
}

func DefaultConfigPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".overmind", "config.yaml")
}

func Load(path string) (*Config, error) {
	if path == "" {
		path = DefaultConfigPath()
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("config: read %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("config: parse %s: %w", path, err)
	}

	cfg.Credentials.Stripe.SecretKey = expandEnvValue(cfg.Credentials.Stripe.SecretKey)
	cfg.Credentials.PostHog.APIKey = expandEnvValue(cfg.Credentials.PostHog.APIKey)
	cfg.Credentials.PostHog.ProjectID = expandEnvValue(cfg.Credentials.PostHog.ProjectID)
	cfg.Credentials.PostHog.Host = expandEnvValue(cfg.Credentials.PostHog.Host)

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	warnIfEmptyCredentials(&cfg)

	return &cfg, nil
}

func (c *Config) ToProducts() []domain.Product {
	products := make([]domain.Product, 0, len(c.Products))
	for _, p := range c.Products {
		products = append(products, domain.Product{
			Name:        p.Name,
			Domain:      p.Domain,
			StripeID:    p.Stripe.ProductID,
			PostHogHost: p.PostHog.HostFilter,
		})
	}
	return products
}

func expandEnvValue(value string) string {
	if strings.HasPrefix(value, "${") && strings.HasSuffix(value, "}") && len(value) > 3 {
		key := strings.TrimSuffix(strings.TrimPrefix(value, "${"), "}")
		return os.Getenv(key)
	}
	return value
}

func validateConfig(cfg *Config) error {
	if len(cfg.Products) == 0 {
		return errors.New("config: no products defined")
	}

	for i, product := range cfg.Products {
		if product.Name == "" {
			return fmt.Errorf("config: products[%d] missing name", i)
		}
		if product.Domain == "" {
			return fmt.Errorf("config: product %q missing domain", product.Name)
		}
	}

	return nil
}

func warnIfEmptyCredentials(cfg *Config) {
	if cfg.Credentials.Stripe.SecretKey == "" {
		log.Printf("config: warning: stripe secret_key is empty")
	}
	if cfg.Credentials.PostHog.APIKey == "" {
		log.Printf("config: warning: posthog api_key is empty")
	}
}
