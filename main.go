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
	// Load config.
	cfg, err := config.Load("")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading config: %v\n", err)
		os.Exit(1)
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
		fmt.Fprintf(os.Stderr, "Error opening store: %v\n", err)
		os.Exit(1)
	}
	defer s.Close()

	// Create TUI model.
	products := cfg.ToProducts()
	model := tui.New(products, p, s)

	// Run program.
	prog := tea.NewProgram(model, tea.WithAltScreen())
	if _, err := prog.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
