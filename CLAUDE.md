# Overmind

Portfolio command center for indie hackers. Track traffic, health, and traction signals across all your products.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment (copy and fill in values)
cp .env.local.example .env.local

# Set up Convex
npx convex dev --once --configure=new

# Run development server
pnpm dev
```

## Required Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=           # From npx convex dev
CONVEX_DEPLOYMENT=                # From npx convex dev

# Clerk (get from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
```

## Architecture

```
overmind/
├── app/
│   ├── dashboard/           # Main dashboard (protected)
│   │   ├── layout.tsx       # Sidebar layout
│   │   ├── page.tsx         # Product grid view
│   │   ├── products/        # Product management
│   │   └── settings/        # User settings
│   ├── sign-in/             # Clerk auth pages
│   ├── sign-up/
│   ├── components/          # Shared components
│   │   ├── product-card.tsx # Product display card
│   │   └── stats-card.tsx   # Metric display card
│   ├── globals.css          # Design system tokens
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page
│   └── providers.tsx        # Clerk + Convex providers
├── convex/
│   ├── schema.ts            # Data model
│   ├── products.ts          # Product CRUD
│   ├── metrics.ts           # Metrics queries
│   └── auth.config.ts       # Clerk JWT config
├── config/
│   └── products.yaml        # Legacy product data (for import)
└── middleware.ts            # Clerk route protection
```

## Data Model

| Table | Purpose |
|-------|---------|
| products | Product registry (name, domain, service IDs) |
| metricsSnapshots | Historical metrics (visits, health, revenue) |
| connections | OAuth tokens for Vercel/Stripe/Sentry |
| userSettings | User preferences |

## Design System

Dark theme primary. Colors defined in `globals.css`:

- **Background**: `#09090b` (base), `#18181b` (subtle), `#27272a` (elevated)
- **Status**: green (healthy), yellow (warning), red (error), amber (traction signal)
- **Interactive**: blue for links and buttons

## Key Concepts

- **Traction Signal**: >100 visits/week = worth investigating
- **Health Check**: HTTP 2xx/3xx = healthy
- **Product Card**: Shows visits, devices, bounce rate, health status

## Roadmap

### Phase 1: Foundation ✓
- [x] Next.js 15 + Convex + Clerk scaffold
- [x] Dashboard shell with sidebar
- [x] Product card components
- [x] Design system tokens

### Phase 2: Core Features
- [ ] Product CRUD UI
- [ ] Vercel Analytics integration (port from CLI)
- [ ] Health check implementation
- [ ] Manual refresh button

### Phase 3: Storage + Trends
- [ ] Metrics cron job
- [ ] Historical snapshots
- [ ] Sparkline charts
- [ ] Week-over-week deltas

### Phase 4: Polish
- [ ] Settings page
- [ ] YAML import
- [ ] Deploy to Vercel

## Code Style

- TypeScript strict mode
- Tailwind 4 with CSS variables
- Minimal dependencies
- Dark mode first
