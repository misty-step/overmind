# Overmind

Portfolio command center for indie hackers. One command to see all your products.

## Quick Start

```bash
pnpm install
pnpm dev           # Run CLI
pnpm dev --html    # Generate HTML dashboard
```

## Architecture

```
overmind/
├── src/
│   └── cli.ts           # Main entry point, all logic currently here
├── config/
│   └── products.yaml    # Product registry (domains, Vercel IDs, etc.)
├── docs/                # Future documentation
└── package.json
```

## Key Concepts

**Traction Signal**: >100 visits/week = worth investigating
**Health Check**: HTTP 2xx/3xx = healthy
**Zero Config Auth**: Reads Vercel CLI token automatically

## Data Sources

| Source | What | How |
|--------|------|-----|
| Vercel Analytics API | visits, devices, bounce | Bearer token from CLI auth file |
| HTTP health check | site responding | curl status code |
| (Future) Stripe | revenue | CLI config |
| (Future) Sentry | errors | API token |

## Auth Flow

1. User runs `vercel login` (one time)
2. CLI stores token at `~/Library/Application Support/com.vercel.cli/auth.json`
3. Overmind reads this file, uses token for Analytics API
4. No manual token creation needed

## Roadmap

- [ ] Stripe revenue integration
- [ ] Sentry error counts
- [ ] Week-over-week deltas
- [ ] Historical data storage
- [ ] Web dashboard (deployable)
- [ ] Watch mode (--watch)

## Code Style

- TypeScript, strict mode
- Single file for now (cli.ts) - extract when complexity warrants
- Minimal dependencies (just `yaml` for config parsing)
- CLI-first, browser-second

## Testing

Run manually against real products. No unit tests yet (YAGNI for a personal tool).

When adding features:
1. Test against live Vercel projects
2. Verify auth works (run `vercel login` if issues)
3. Check both CLI and HTML output modes
