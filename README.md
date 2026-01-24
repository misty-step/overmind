# Overmind

**Portfolio command center for indie hackers.**

One command. All your products. Instant traction signals.

```
$ overmind

┌──────────────────────────────────────────────────────────────────┐
│ PORTFOLIO - Week of Jan 23                                       │
├──────────────────────────────────────────────────────────────────┤
│ Product         │ Visits │ Devices │ Bounce │ Health │ Status   │
├──────────────────────────────────────────────────────────────────┤
│ Line Jam        │    652 │      48 │    60% │   🟢   │ ⚠️ SIGNAL │
│ Bibliomnomnom   │    334 │      32 │    50% │   🟢   │ ⚠️ SIGNAL │
│ Chrondle        │    101 │      39 │    31% │   🟢   │ ⚠️ SIGNAL │
│ Volume          │     55 │      13 │    54% │   🟢   │ 🟢 Active │
│ ...             │        │         │        │        │          │
└──────────────────────────────────────────────────────────────────┘

📊 1,188 total visits across 7 active products
🏥 16/17 sites healthy

⚠️ TRACTION SIGNALS:
   Line Jam: 652 visits (48 devices)
   Bibliomnomnom: 334 visits (32 devices)
   Chrondle: 101 visits (39 devices)
```

## Why Overmind?

**The indie hacker's dilemma:** You're shipping experiments fast. Maybe 5, 10, 15 products in flight. Each has its own dashboard, its own analytics, its own metrics. Checking them all takes forever.

**The solution:** One command that aggregates everything. See which experiments are getting traction. Ignore the rest. Double down on winners.

## Philosophy

- **Zero config** — Uses your existing CLI auth (Vercel, Stripe, GitHub)
- **Passive discovery** — Run weekly, spot anomalies, move on
- **Signal over noise** — Only surfaces what matters (>100 visits = traction signal)
- **CLI-first** — Fits your terminal workflow, no browser tabs

## Features

| Feature | Status |
|---------|--------|
| Vercel Analytics (visits, devices, bounce) | ✅ |
| Site health checks | ✅ |
| Traction signal detection | ✅ |
| HTML export | ✅ |
| Stripe revenue integration | 🔜 |
| Sentry error counts | 🔜 |
| Historical tracking | 🔜 |
| Web dashboard | 🔜 |

## Installation

```bash
# Clone and install
git clone https://github.com/misty-step/overmind.git
cd overmind
pnpm install

# Run
pnpm dev

# Or install globally
pnpm build
npm link
overmind
```

## Configuration

Products are defined in `config/products.yaml`:

```yaml
products:
  - name: My App
    domain: myapp.com
    vercel_project_id: prj_xxxxx  # From: vercel projects ls --json
    stripe_product_id: prod_xxxxx  # From: stripe products list
    github_repo: username/repo
```

### Getting IDs

```bash
# Vercel project IDs
npx vercel projects ls --json | jq '.[].id'

# Stripe product IDs
stripe products list --limit 100

# GitHub repos
gh repo list your-org --json name
```

## Auth

Overmind uses your existing CLI auth. No API tokens to manage.

| Service | Auth Source |
|---------|-------------|
| Vercel | `~/Library/Application Support/com.vercel.cli/auth.json` |
| Stripe | `~/.config/stripe/config.toml` (coming soon) |
| GitHub | `gh` CLI auth |

**Prerequisite:** Run `vercel login` once.

## Usage

```bash
# Default: CLI output
overmind

# HTML dashboard
overmind --html
# Opens ~/overmind-dashboard.html

# Single product
overmind volume

# Watch mode (coming soon)
overmind --watch
```

## The Workflow

**Weekly (5 min):**
1. Run `overmind`
2. Note any traction signals (⚠️)
3. If signal: investigate traffic source, consider doubling down
4. If no signal: keep shipping experiments

**That's it.** Marketing for the experimentation phase should be nearly invisible.

## Roadmap

### v0.2 — Revenue & Errors
- Stripe revenue per product
- Sentry error counts
- Week-over-week deltas

### v0.3 — Historical
- Store metrics over time
- Trend visualization
- Anomaly detection

### v0.4 — Web Dashboard
- Deployed web view
- Mobile-friendly
- Auto-refresh

### v1.0 — Product
- Multi-user support
- Team portfolios
- Public launch

## Architecture

```
overmind/
├── src/
│   └── cli.ts           # Main entry point
├── config/
│   └── products.yaml    # Product registry
├── docs/
│   └── ...              # Additional documentation
└── package.json
```

## Contributing

This started as an internal tool for MistyStep. If you're an indie hacker with a portfolio of experiments, we'd love your feedback.

## License

MIT
