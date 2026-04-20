#!/bin/bash
# Create JIRA ticket script
# Usage: ./create-jira-ticket.sh "Title" "Description" "Task|Epic|Subtask" [parent_key]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env.jira"

TITLE="$1"
DESCRIPTION="$2"
ISSUE_TYPE="${3:-Task}"
PARENT_KEY="$4"

if [ -z "$TITLE" ]; then
    echo "Usage: ./create-jira-ticket.sh \"Title\" \"Description\" \"Task|Epic|Subtask\" [parent_key]"
    exit 1
fi

# Map issue type names to IDs
case "$ISSUE_TYPE" in
    "Epic") TYPE_ID="10002" ;;
    "Task") TYPE_ID="10001" ;;
    "Subtask") TYPE_ID="10003" ;;
    *) TYPE_ID="10001" ;;
esac

# Build JSON payload using Python for proper escaping
if [ "$ISSUE_TYPE" = "Subtask" ] && [ -n "$PARENT_KEY" ]; then
    PAYLOAD=$(python3 -c "
import json
payload = {
    'fields': {
        'project': {'key': '$JIRA_PROJECT_KEY'},
        'summary': '''$TITLE''',
        'description': {
            'type': 'doc',
            'version': 1,
            'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': '''$DESCRIPTION'''}]}]
        },
        'issuetype': {'id': '$TYPE_ID'},
        'parent': {'key': '$PARENT_KEY'}
    }
}
print(json.dumps(payload))
")
else
    PAYLOAD=$(python3 -c "
import json
payload = {
    'fields': {
        'project': {'key': '$JIRA_PROJECT_KEY'},
        'summary': '''$TITLE''',
        'description': {
            'type': 'doc',
            'version': 1,
            'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': '''$DESCRIPTION'''}]}]
        },
        'issuetype': {'id': '$TYPE_ID'}
    }
}
print(json.dumps(payload))
")
fi

# Create the issue
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    -d "${PAYLOAD}" \
    "https://${JIRA_URL}/rest/api/3/issue")

# Extract and display result
KEY=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('key', 'ERROR'))" 2>/dev/null || echo "ERROR")

if [ "$KEY" = "ERROR" ]; then
    echo "Failed to create ticket:"
    echo "$RESPONSE"
    exit 1
else
    echo "✓ Created: ${KEY} - ${TITLE}"
    echo "  URL: https://${JIRA_URL}/browse/${KEY}"
fi
