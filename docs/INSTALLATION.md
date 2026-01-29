# Installation Guide

## Prerequisites

- **Go 1.24+** - [Install Go](https://go.dev/dl/)
- **Stripe account** - For revenue metrics (optional)
- **PostHog account** - For traffic analytics (optional)

## Install

### From Source

```bash
git clone https://github.com/misty-step/overmind.git
cd overmind
go build -o overmind .
./overmind
```

### Using Go Install

```bash
go install github.com/phaedrus/overmind@latest
overmind
```

## Configuration

Overmind uses a YAML config file at `~/.overmind/config.yaml`.

### 1. Create Config Directory

```bash
mkdir -p ~/.overmind
```

### 2. Copy Example Config

```bash
cp config/config.example.yaml ~/.overmind/config.yaml
```

### 3. Set Up Credentials

You can either hardcode credentials in the config or use environment variables with `${VAR_NAME}` syntax.

#### Environment Variables (Recommended)

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export STRIPE_SECRET_KEY="sk_live_..."
export POSTHOG_PERSONAL_API_KEY="phx_..."
export POSTHOG_PROJECT_ID="123456"
export POSTHOG_HOST="https://us.i.posthog.com"
```

Then in your config:

```yaml
credentials:
  stripe:
    secret_key: ${STRIPE_SECRET_KEY}
  posthog:
    api_key: ${POSTHOG_PERSONAL_API_KEY}
    project_id: ${POSTHOG_PROJECT_ID}
    host: ${POSTHOG_HOST}
```

## Getting Your Credentials

### Stripe

#### Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** in the sidebar
3. Click **API keys**
4. Copy the **Secret key** (starts with `sk_live_` or `sk_test_`)

> **Note:** Use test keys (`sk_test_`) during development. Never commit live keys.

#### Product ID

1. Go to [Products](https://dashboard.stripe.com/products) in Stripe Dashboard
2. Click on a product
3. Copy the ID from the URL or the product details (starts with `prod_`)

### PostHog

#### Personal API Key

1. Go to [PostHog](https://app.posthog.com/) (or your self-hosted instance)
2. Click your avatar → **Settings**
3. Click **Personal API Keys**
4. Create a new key and copy it (starts with `phx_`)

#### Project ID

1. Go to [PostHog Project Settings](https://app.posthog.com/project/settings)
2. Find **Project ID** in the project details (a number like `293836`)

#### Host

Choose based on your PostHog region:

| Region | Host |
|--------|------|
| US Cloud | `https://us.i.posthog.com` |
| EU Cloud | `https://eu.i.posthog.com` |
| Self-hosted | Your PostHog instance URL |

## Configure Products

Add your products to the config:

```yaml
products:
  - name: "My SaaS"
    domain: "mysaas.com"
    stripe:
      product_id: "prod_ABC123"  # Optional: for revenue metrics
    posthog:
      host_filter: "mysaas.com"  # Optional: for traffic metrics

  - name: "Side Project"
    domain: "sideproject.io"
    # No Stripe or PostHog = health checks only
```

Each product can have:
- **domain** (required): For health checks
- **stripe.product_id** (optional): For MRR and subscriber counts
- **posthog.host_filter** (optional): For pageview and visitor counts

## Verify Installation

Run the CLI:

```bash
./overmind
```

You should see the TUI with your products. If something is misconfigured, you'll see an error message explaining what's missing.

### Common Errors

| Error | Solution |
|-------|----------|
| `config: read ~/.overmind/config.yaml: no such file` | Create the config file (see step 2) |
| `config: missing stripe secret_key` | Add Stripe credentials or remove `stripe.product_id` from products |
| `config: missing posthog api_key` | Add PostHog credentials or remove `posthog.host_filter` from products |

## Cache Location

Overmind stores cached metrics in `~/.overmind/cache/metrics.db` (SQLite). This enables offline viewing of recent metrics.

To clear the cache:

```bash
rm -rf ~/.overmind/cache
```
