# Overmind

Portfolio command center CLI for indie hackers. Track traffic, health, revenue.

## Quick Start

```bash
go build ./...
./overmind
```

## Required Environment Variables

```bash
STRIPE_SECRET_KEY=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_HOST=
```

## Architecture

```
overmind/
├── main.go                 # CLI entry
├── internal/
│   ├── config/             # config load + validation
│   ├── domain/             # core types + interfaces
│   ├── providers/          # PostHog/Stripe/health clients
│   ├── store/              # local cache
│   └── tui/                # terminal UI
└── config/products.yaml    # legacy product data (for import)
```

## Key Concepts

- **Traction Signal**: >100 visits/week = worth a look
- **Health Check**: HTTP 2xx/3xx = healthy

## Roadmap

- [ ] Stripe MRR + subscribers
- [ ] PostHog cohort/unique improvements
- [ ] Metrics cache retention + export

## Code Style

- gofmt
- small funcs
- explicit errors
- minimal deps
