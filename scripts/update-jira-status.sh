#!/bin/bash
# Update JIRA ticket status
# Usage: ./update-jira-status.sh KAN-2 "Done"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env.jira"

TICKET_KEY="$1"
TARGET_STATUS="$2"

if [ -z "$TICKET_KEY" ] || [ -z "$TARGET_STATUS" ]; then
    echo "Usage: ./update-jira-status.sh TICKET_KEY STATUS"
    echo "Example: ./update-jira-status.sh KAN-2 Done"
    exit 1
fi

# Get available transitions
TRANSITIONS=$(curl -s -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    "https://${JIRA_URL}/rest/api/3/issue/${TICKET_KEY}/transitions")

# Find the transition ID for the target status
TRANSITION_ID=$(echo "$TRANSITIONS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('transitions', []):
    if t['name'].lower() == '${TARGET_STATUS}'.lower():
        print(t['id'])
        break
")

if [ -z "$TRANSITION_ID" ]; then
    echo "Could not find transition to '${TARGET_STATUS}'"
    echo "Available transitions:"
    echo "$TRANSITIONS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('transitions', []):
    print(f\"  - {t['name']}\")"
    exit 1
fi

# Execute the transition
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    -d "{\"transition\": {\"id\": \"${TRANSITION_ID}\"}}" \
    "https://${JIRA_URL}/rest/api/3/issue/${TICKET_KEY}/transitions")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "204" ]; then
    echo "✓ ${TICKET_KEY} → ${TARGET_STATUS}"
    echo "  URL: https://${JIRA_URL}/browse/${TICKET_KEY}"
else
    echo "Failed to update ${TICKET_KEY}:"
    echo "$BODY"
    exit 1
fi
