#!/bin/bash

# Set your webhook secret
export STRIPE_WEBHOOK_SECRET="whsec_HjtqRNYNQUNqdEyTyisfS5XrXejbAWFe"

# Create test payload
read -r -d '' BODY << 'EOF'
{
  "id": "evt_test_123",
  "object": "event",
  "api_version": "2025-04-30.basil",
  "created": 1234567890,
  "data": {
    "object": {
      "id": "pi_test_123",
      "object": "payment_intent"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "type": "payment_intent.succeeded"
}
EOF

# Get timestamp and signature
TIMESTAMP=$(date +%s)
SIGNING_PAYLOAD="${TIMESTAMP}.${BODY}"
SIGNATURE=$(echo -n "${SIGNING_PAYLOAD}" | openssl dgst -sha256 -hmac "${STRIPE_WEBHOOK_SECRET}" | cut -d' ' -f2)

# Print debug info
echo "=== Test Webhook Request ==="
echo "Endpoint: https://app.seloraa.com/webhook"
echo "Timestamp: ${TIMESTAMP}"
echo "Signature: ${SIGNATURE}"
echo ""

# Send request
echo "Sending test webhook..."
curl -v -X POST https://app.seloraa.com/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=${TIMESTAMP},v1=${SIGNATURE}" \
  -d "${BODY}"
