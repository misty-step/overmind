#!/bin/bash
# Setup Vercel Analytics Drains for ALL products in products.yaml
#
# Usage: ./scripts/setup-all-drains.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YAML_FILE="${SCRIPT_DIR}/../config/products.yaml"

if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: products.yaml not found at $YAML_FILE"
  exit 1
fi

# Extract project IDs and names from YAML
# Format: prj_xxx name
PROJECTS=$(grep -A1 "name:" "$YAML_FILE" | \
  grep -E "(name:|vercel_project_id:)" | \
  paste - - | \
  sed 's/.*name: *\([^ ]*\).*vercel_project_id: *\([^ ]*\).*/\2 \1/' | \
  grep "^prj_")

echo "Setting up drains for all products..."
echo ""

COUNT=0
while IFS=' ' read -r project_id name; do
  if [[ -n "$project_id" && -n "$name" ]]; then
    echo "→ $name ($project_id)"
    "$SCRIPT_DIR/setup-drain.sh" "$project_id" "overmind-${name,,}" 2>&1 | grep -E "(Success|Error|already)"
    COUNT=$((COUNT + 1))
    echo ""
  fi
done <<< "$PROJECTS"

echo "Done! Set up $COUNT drains."
echo ""
echo "To list all active drains:"
echo "  curl -s -H 'Authorization: Bearer \$VERCEL_TOKEN' 'https://api.vercel.com/v1/drains' | jq '.drains[] | {name, id}'"
