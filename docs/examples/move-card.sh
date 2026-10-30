#!/usr/bin/env bash

set -euo pipefail

# Required environment variables:
# API_TOKEN, CARD_ID, COLUMN_ID, POSITION, VERSION

BASE_URL="${BASE_URL:-https://api.example.com/v2}"

: "${API_TOKEN:?Set API_TOKEN}"
: "${CARD_ID:?Set CARD_ID}"
: "${COLUMN_ID:?Set COLUMN_ID}"
: "${POSITION:?Set POSITION}"
: "${VERSION:?Set VERSION}"

# Validate numeric parameters.
if ! [[ "$POSITION" =~ ^[0-9]+$ ]]; then
  echo "Error: POSITION must be a non-negative integer."
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+$ ]]; then
  echo "Error: VERSION must be a non-negative integer."
  exit 1
fi

# Confirm jq is installed.
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install jq and try again."
  exit 1
fi

ENDPOINT="${BASE_URL}/cards/${CARD_ID}/move"

# Construct the request body.
REQUEST_BODY=$(jq -n \
  --arg columnId "$COLUMN_ID" \
  --argjson position "$POSITION" \
  --argjson version "$VERSION" \
  '{
    columnId: $columnId,
    position: $position,
    version: $version
  }')

echo "Moving card ${CARD_ID}..."
echo "Destination column: ${COLUMN_ID}"
echo "Position: ${POSITION}"
echo "Card version: ${VERSION}"

# Send the request and capture the HTTP status.
RESPONSE=$(curl -sS \
  -X PATCH "$ENDPOINT" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" \
  -w '\n%{http_code}')

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo
echo "HTTP Status: ${HTTP_STATUS}"

case "$HTTP_STATUS" in
  2??)
    echo "Card moved successfully."
    echo "$RESPONSE_BODY" | jq .
    ;;

  409)
    ERROR_CODE=$(echo "$RESPONSE_BODY" | jq -r '.error.code // "UNKNOWN"')

    if [[ "$ERROR_CODE" == "VERSION_CONFLICT" ]]; then
      echo "Version conflict: the card was updated by someone else."
      echo "Retrieve the latest card version before retrying."
    else
      echo "Request rejected with HTTP 409."
    fi

    echo "$RESPONSE_BODY" | jq .
    exit 1
    ;;

  *)
    echo "Card move failed."
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    exit 1
    ;;
esac