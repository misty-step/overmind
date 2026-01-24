# Overmind

**Portfolio command center for indie hackers.**

Track traffic, health, and traction signals across all your products. One dashboard. Real insights.

## The Problem

You have 10+ products. Each has its own Vercel dashboard, Stripe dashboard, Sentry project. You're drowning in tabs. You miss the signal that Line Jam is suddenly getting traction because you're busy checking Chrondle's error logs.

## The Solution

Overmind aggregates everything into one war room:

- **Traffic** — Visits, devices, bounce rate (via Vercel Drains)
- **Health** — HTTP status, response time
- **Traction Signals** — Automatic alerts when something's working
- *Coming soon:* Revenue (Stripe), Errors (Sentry)

## Stack

- **Frontend:** Next.js 15 (App Router)
- **Backend:** Convex
- **Auth:** Clerk
- **Analytics:** Vercel Drains (real-time event streaming)
- **Styling:** Tailwind CSS 4

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.local.example .env.local
# Fill in Clerk + Convex keys

# Run development
pnpm dev
```

## Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Setting Up Vercel Drains

Overmind receives analytics via Vercel Drains (Pro plan required).

```bash
# Set up drain for all your Vercel projects
./scripts/create-unified-drain.sh
```

This creates a single drain that streams all pageview events to Overmind in real-time.

## Architecture

```
app/
  dashboard/           # Main dashboard (protected)
    products/          # Product management
    settings/          # User settings
  components/          # Shared components
convex/
  schema.ts            # Data model
  products.ts          # Product CRUD
  metrics.ts           # Metrics queries
  analytics.ts         # Drain event aggregation
  http.ts              # HTTP endpoint for drains
scripts/
  create-unified-drain.sh   # One-click drain setup
```

## Roadmap

- [x] Product registry + import
- [x] Health checks
- [x] Vercel Drains integration
- [ ] Stripe integration (MRR, subscribers)
- [ ] Sentry integration (error counts)
- [ ] Vercel OAuth (auto-discover projects)
- [ ] Traction signal alerts
- [ ] Historical trends + sparklines

## License

Private. Not for distribution.
