# Overmind

Portfolio command center CLI for indie hackers. Track traffic, revenue, and health across all your products.

## Features

- **Traffic** - Pageviews and visitors (PostHog)
- **Revenue** - MRR and subscribers (Stripe)
- **Health** - HTTP response status and latency
- **Trends** - 7-day sparklines showing visit history
- **Traction Signals** - Highlights products getting >100 visits/week

## Quick Start

```bash
# Build
go build ./...

# Run
./overmind
```

## Configuration

Copy the example config and customize:

```bash
mkdir -p ~/.overmind
cp config/config.example.yaml ~/.overmind/config.yaml
# Edit with your Stripe/PostHog credentials
```

See [config/config.example.yaml](config/config.example.yaml) for all options.

Environment variables can be referenced in the config via `${VAR_NAME}` syntax.

## Keybindings

| Key | Action |
|-----|--------|
| `r` | Refresh all metrics |
| `s` | Cycle sort (MRR → Visits → Name → Health) |
| `j/k` | Navigate up/down |
| `q` | Quit |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design.

```
overmind/
├── main.go              # Entry point
├── internal/
│   ├── config/          # YAML config with env expansion
│   ├── domain/          # Core types (Product, Metrics)
│   ├── providers/       # PostHog, Stripe, health + MetricsFetcher
│   ├── store/           # SQLite cache for trends
│   └── tui/             # Bubble Tea terminal UI
└── config/              # Example configuration
```

## Install via Homebrew (coming soon)

```bash
brew tap phaedrus/tap
brew install overmind
```

## License

MIT
