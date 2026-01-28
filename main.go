package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/phaedrus/overmind/internal/config"
	"github.com/phaedrus/overmind/internal/providers"
	"github.com/phaedrus/overmind/internal/store"
	"github.com/phaedrus/overmind/internal/tui"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Load config.
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Initialize providers.
	p := providers.New(
		cfg.Credentials.Stripe.SecretKey,
		cfg.Credentials.PostHog.APIKey,
		cfg.Credentials.PostHog.ProjectID,
		cfg.Credentials.PostHog.Host,
	)

	// Initialize store.
	s, err := store.Open("")
	if err != nil {
		return fmt.Errorf("opening store: %w", err)
	}
	defer s.Close()

	fetcher := p.NewMetricsFetcher(s)

	// Create TUI model.
	products := cfg.ToProducts()
	model := tui.New(products, fetcher)

	// Run program.
	prog := tea.NewProgram(model, tea.WithAltScreen())
	if _, err := prog.Run(); err != nil {
		return err
	}

	return nil
}
