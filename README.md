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

Create `~/.overmind/config.yaml`:

```yaml
credentials:
  stripe:
    secret_key: ${STRIPE_SECRET_KEY}
  posthog:
    api_key: ${POSTHOG_PERSONAL_API_KEY}
    project_id: "12345"
    host: https://us.i.posthog.com

products:
  - name: MyApp
    domain: myapp.com
    stripe_id: prod_xxx
    posthog_host: myapp.com
```

Or set environment variables:
```bash
export STRIPE_SECRET_KEY=sk_live_xxx
export POSTHOG_PERSONAL_API_KEY=phx_xxx
```

## Keybindings

| Key | Action |
|-----|--------|
| `r` | Refresh all metrics |
| `s` | Cycle sort (MRR → Visits → Name → Health) |
| `j/k` | Navigate up/down |
| `q` | Quit |

## Architecture

```
overmind/
├── main.go              # Entry point
├── internal/
│   ├── config/          # YAML config with env expansion
│   ├── domain/          # Types + provider interfaces
│   ├── providers/       # PostHog, Stripe, health clients
│   ├── store/           # SQLite cache for history
│   └── tui/             # Bubble Tea terminal UI
└── config/products.yaml # Example config
```

## Install via Homebrew (coming soon)

```bash
brew tap phaedrus/tap
brew install overmind
```

## License

MIT
