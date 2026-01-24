#!/bin/bash
# Setup Vercel Analytics Drain to send events to Convex
#
# Usage: ./scripts/setup-drain.sh <vercel-project-id>
# Example: ./scripts/setup-drain.sh prj_Ix0Z40dkWidhfm5AVkhZbjZ3a8ic

set -e

# Configuration
CONVEX_SITE_URL="https://resilient-poodle-96.convex.site"
DRAIN_ENDPOINT="${CONVEX_SITE_URL}/drain/analytics"

# Get Vercel token from local auth
AUTH_FILE="${HOME}/Library/Application Support/com.vercel.cli/auth.json"
if [[ ! -f "$AUTH_FILE" ]]; then
  echo "Error: Vercel CLI not authenticated. Run 'vercel login' first."
  exit 1
fi

VERCEL_TOKEN=$(grep -o '"token": "[^"]*' "$AUTH_FILE" | cut -d'"' -f4)
if [[ -z "$VERCEL_TOKEN" ]]; then
  echo "Error: Could not read Vercel token from $AUTH_FILE"
  exit 1
fi

# Check arguments
if [[ -z "$1" ]]; then
  echo "Usage: $0 <vercel-project-id> [drain-name]"
  echo ""
  echo "List your Vercel projects to find the ID:"
  echo "  curl -s -H 'Authorization: Bearer \$VERCEL_TOKEN' \\"
  echo "    'https://api.vercel.com/v9/projects' | jq '.projects[] | {name, id}'"
  echo ""
  echo "Your Vercel projects:"
  curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects?limit=10" | jq -r '.projects[] | "  \(.id)  \(.name)"'
  exit 1
fi

PROJECT_ID="$1"
DRAIN_NAME="${2:-overmind-analytics-$(echo $PROJECT_ID | cut -c1-8)}"

echo "Creating Vercel Analytics Drain..."
echo "  Project: $PROJECT_ID"
echo "  Endpoint: $DRAIN_ENDPOINT"
echo "  Name: $DRAIN_NAME"
echo ""

# Create the drain
RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/drains" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$DRAIN_NAME"'",
    "projects": "some",
    "projectIds": ["'"$PROJECT_ID"'"],
    "schemas": { "analytics": { "version": "v1" } },
    "delivery": {
      "type": "http",
      "endpoint": "'"$DRAIN_ENDPOINT"'",
      "encoding": "json",
      "headers": {}
    }
  }')

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error creating drain:"
  echo "$RESPONSE" | jq '.error'
  exit 1
fi

DRAIN_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Success! Drain created: $DRAIN_ID"
echo ""
echo "Analytics events will now flow from Vercel to Overmind."
echo "Note: Events are forwarded in real-time as pageviews occur."
echo ""
echo "To verify, check the drain status:"
echo "  curl -s -H 'Authorization: Bearer \$VERCEL_TOKEN' \\"
echo "    'https://api.vercel.com/v1/drains' | jq '.drains[] | select(.id==\"$DRAIN_ID\")'"
