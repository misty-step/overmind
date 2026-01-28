# Architecture

Overmind is a Go CLI that aggregates metrics from multiple services into a terminal dashboard.

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PostHog   │     │   Stripe    │     │   HTTP      │
│  (traffic)  │     │  (revenue)  │     │  (health)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Fetcher   │  Parallel fetch via errgroup
                    │  (providers)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Store    │  SQLite cache for trends
                    │   (store)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     TUI     │  Bubble Tea terminal UI
                    │    (tui)    │
                    └─────────────┘
```

## Package Overview

| Package | Responsibility |
|---------|----------------|
| `main` | Entry point, wires dependencies |
| `config` | YAML config loading with env var expansion |
| `domain` | Core types: Product, Metrics, Signal |
| `providers` | External service clients + MetricsFetcher orchestration |
| `store` | SQLite persistence for historical metrics |
| `tui` | Terminal UI rendering with Bubble Tea |

## Key Design Decisions

### MetricsFetcher (Deep Module)

The `providers.MetricsFetcher` hides all data fetching complexity:
- Parallel fetching via errgroup
- Individual provider clients (Stripe, PostHog, health)
- Historical data lookup for sparklines
- Error handling (best-effort, no failures surface)

The TUI only calls `fetcher.FetchAll(ctx, products)` and receives a map of metrics.

### SQLite Cache

Metrics are cached locally in `~/.overmind/cache/metrics.db`. This enables:
- 7-day sparkline trends without re-fetching
- Offline viewing of last-known state
- Fast startup (no network required for cached data)

### Configuration

Config lives in `~/.overmind/config.yaml`. Environment variables can be referenced via `${VAR_NAME}` syntax for secrets.

## Module Boundaries

```
main.go
  └── config.Load()         → Config
  └── providers.New()       → Providers (Stripe, PostHog clients)
  └── store.Open()          → Store (SQLite)
  └── providers.NewMetricsFetcher(providers, store) → MetricsFetcher
  └── tui.New(products, fetcher) → Model
  └── tea.NewProgram(model) → Run
```

The TUI has no knowledge of:
- How metrics are fetched (parallel? sequential?)
- Which providers exist
- How caching works

This keeps the TUI focused on rendering and user interaction.
