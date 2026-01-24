#!/bin/bash
# Create a single unified drain for all accessible Vercel projects

set -e

CONVEX_SITE_URL="https://resilient-poodle-96.convex.site"
DRAIN_ENDPOINT="${CONVEX_SITE_URL}/drain/analytics"

# Get Vercel token
AUTH_FILE="${HOME}/Library/Application Support/com.vercel.cli/auth.json"
VERCEL_TOKEN=$(grep -o '"token": "[^"]*' "$AUTH_FILE" | cut -d'"' -f4)

# Get all project IDs (up to 100)
echo "Fetching all Vercel projects..."
PROJECT_IDS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects?limit=100" | \
  jq -r '[.projects[].id] | @json')

echo "Found projects: $PROJECT_IDS"
echo ""

# Create the unified drain
echo "Creating unified drain..."
RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/drains" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "overmind-unified",
    "projects": "some",
    "projectIds": '"$PROJECT_IDS"',
    "schemas": { "analytics": { "version": "v1" } },
    "delivery": {
      "type": "http",
      "endpoint": "'"$DRAIN_ENDPOINT"'",
      "encoding": "json",
      "headers": {}
    }
  }')

if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error:"
  echo "$RESPONSE" | jq '.error'
  exit 1
fi

DRAIN_ID=$(echo "$RESPONSE" | jq -r '.id')
PROJECT_COUNT=$(echo "$PROJECT_IDS" | jq 'length')

echo ""
echo "Success! Created unified drain: $DRAIN_ID"
echo "Covering $PROJECT_COUNT projects"
echo ""
echo "All analytics events from these projects will now flow to Overmind."
