#!/usr/bin/env bash
# E2E smoke: register → login → product → stock → cart → checkout → poll saga.
# Prerequisites: cp .env.example .env (JWT_HASH set), docker compose up -d --build
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
STOCK_TIMEOUT="${STOCK_TIMEOUT:-30}"
ORDER_TIMEOUT="${ORDER_TIMEOUT:-60}"
EXPECTED_PAYMENT_RESULT="${PAYMENT_FORCE_RESULT:-success}"

RUN_ID="$(date +%s)-$$"
USERNAME="e2e-${RUN_ID}"
PASSWORD="e2e-pass-${RUN_ID}"
PRODUCT_NAME="E2E Widget ${RUN_ID}"

TOKEN=""
PRODUCT_ID=""
ORDER_ID=""

log() {
  printf '[e2e] %s\n' "$*"
}

fail() {
  printf '[e2e] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# Poll GET url until HTTP 200 or timeout (seconds).
wait_for_http() {
  local url="$1"
  local timeout="$2"
  local label="${3:-$url}"
  local elapsed=0

  log "Waiting for ${label} (timeout ${timeout}s)..."
  while (( elapsed < timeout )); do
    if curl -sf -o /dev/null "$url"; then
      log "${label} is up"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  fail "Timed out waiting for ${label} at ${url}"
}

http_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local auth="${4:-}"

  local args=(
    -sS
    -X "$method"
    -H "Content-Type: application/json"
    -w "\n%{http_code}"
  )

  if [[ -n "$auth" ]]; then
    args+=(-H "Authorization: Bearer ${auth}")
  fi

  if [[ -n "$body" ]]; then
    args+=(-d "$body")
  fi

  local raw
  raw="$(curl "${args[@]}" "${GATEWAY_URL}${path}")"

  local http_code
  http_code="$(printf '%s' "$raw" | tail -n1)"
  local response_body
  response_body="$(printf '%s' "$raw" | sed '$d')"

  printf '%s\n%s' "$http_code" "$response_body"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local context="$3"
  local body="$4"

  if [[ "$actual" != "$expected" ]]; then
    fail "${context}: expected HTTP ${expected}, got ${actual}. Body: ${body}"
  fi
}

step_register() {
  log "1/8 Register user ${USERNAME}"
  local result http_code body
  result="$(http_json POST /api/users "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 201 "$http_code" "POST /api/users" "$body"
}

step_login() {
  log "2/8 Login"
  local result http_code body
  result="$(http_json POST /api/auth "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 200 "$http_code" "POST /api/auth" "$body"

  TOKEN="$(printf '%s' "$body" | jq -er '.token')"
  [[ -n "$TOKEN" && "$TOKEN" != "null" ]] || fail "Login response missing token: ${body}"
}

step_create_product() {
  log "3/8 Create product (JWT required on gateway)"
  local payload result http_code body
  payload="$(jq -nc --arg name "$PRODUCT_NAME" '{name: $name, price: 19.99, description: "E2E smoke product"}')"
  result="$(http_json POST /api/products "$payload" "$TOKEN")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 201 "$http_code" "POST /api/products" "$body"

  PRODUCT_ID="$(printf '%s' "$body" | jq -er '.id')"
  [[ -n "$PRODUCT_ID" && "$PRODUCT_ID" != "null" ]] || fail "Product response missing id: ${body}"
  log "Product id=${PRODUCT_ID}"
}

step_wait_for_stock() {
  log "Waiting for inventory stock record (product.created consumer)..."
  local elapsed=0
  while (( elapsed < STOCK_TIMEOUT )); do
    local result http_code body
    result="$(http_json GET "/api/inventory/${PRODUCT_ID}" "" "$TOKEN")"
    http_code="$(printf '%s' "$result" | head -n1)"
    body="$(printf '%s' "$result" | tail -n +2)"
    if [[ "$http_code" == "200" ]]; then
      log "Stock record ready (qty=$(printf '%s' "$body" | jq -r '.quantity // 0'))"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  fail "Timed out waiting for stock on product ${PRODUCT_ID}"
}

step_set_stock() {
  log "4/8 Set stock PATCH /api/inventory/${PRODUCT_ID}"
  local result http_code body
  result="$(http_json PATCH "/api/inventory/${PRODUCT_ID}" '{"quantity":10}' "$TOKEN")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 200 "$http_code" "PATCH /api/inventory/${PRODUCT_ID}" "$body"

  local qty
  qty="$(printf '%s' "$body" | jq -er '.quantity')"
  (( qty > 0 )) || fail "Stock quantity must be > 0, got ${qty}"
}

step_add_to_cart() {
  log "5/8 Add to cart"
  local payload result http_code body
  payload="$(jq -nc --argjson productId "$PRODUCT_ID" '{productId: $productId, quantity: 1}')"
  result="$(http_json POST /api/cart "$payload" "$TOKEN")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 200 "$http_code" "POST /api/cart" "$body"
}

step_checkout() {
  log "6/8 Checkout POST /api/orders"
  local result http_code body
  result="$(http_json POST /api/orders "{}" "$TOKEN")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 202 "$http_code" "POST /api/orders" "$body"

  ORDER_ID="$(printf '%s' "$body" | jq -er '.orderId')"
  local status
  status="$(printf '%s' "$body" | jq -er '.status')"
  [[ "$status" == "PENDING" ]] || fail "Expected checkout status PENDING, got ${status}"
  log "Order id=${ORDER_ID} status=${status}"
}

step_poll_order() {
  log "7/8 Poll GET /api/orders/${ORDER_ID} until terminal status (timeout ${ORDER_TIMEOUT}s)"
  local elapsed=0
  local last_status=""

  while (( elapsed < ORDER_TIMEOUT )); do
    local result http_code body status
    result="$(http_json GET "/api/orders/${ORDER_ID}" "" "$TOKEN")"
    http_code="$(printf '%s' "$result" | head -n1)"
    body="$(printf '%s' "$result" | tail -n +2)"
    assert_status 200 "$http_code" "GET /api/orders/${ORDER_ID}" "$body"

    status="$(printf '%s' "$body" | jq -er '.status')"
    if [[ "$status" != "$last_status" ]]; then
      log "Order status: ${status}"
      last_status="$status"
    fi

    case "$status" in
      CONFIRMED|CANCELLED)
        FINAL_ORDER_STATUS="$status"
        return 0
        ;;
    esac

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  fail "Timed out waiting for order ${ORDER_ID} to reach CONFIRMED or CANCELLED (last: ${last_status})"
}

step_assert_outcome() {
  log "8/8 Assert saga outcome"
  if [[ "$EXPECTED_PAYMENT_RESULT" == "success" ]]; then
    [[ "$FINAL_ORDER_STATUS" == "CONFIRMED" ]] \
      || fail "Expected CONFIRMED with PAYMENT_FORCE_RESULT=success, got ${FINAL_ORDER_STATUS}"
  elif [[ "$EXPECTED_PAYMENT_RESULT" == "failure" ]]; then
    [[ "$FINAL_ORDER_STATUS" == "CANCELLED" ]] \
      || fail "Expected CANCELLED with PAYMENT_FORCE_RESULT=failure, got ${FINAL_ORDER_STATUS}"
  else
    log "PAYMENT_FORCE_RESULT=${EXPECTED_PAYMENT_RESULT} — accepting CONFIRMED or CANCELLED"
    [[ "$FINAL_ORDER_STATUS" == "CONFIRMED" || "$FINAL_ORDER_STATUS" == "CANCELLED" ]] \
      || fail "Unexpected order status: ${FINAL_ORDER_STATUS}"
  fi
}

step_check_notifications() {
  log "Optional: check mock notifications"
  local result http_code body
  result="$(http_json GET "/api/notifications?limit=20")"
  http_code="$(printf '%s' "$result" | head -n1)"
  body="$(printf '%s' "$result" | tail -n +2)"
  assert_status 200 "$http_code" "GET /api/notifications" "$body"

  local welcome confirmed
  welcome="$(printf '%s' "$body" | jq '[.notifications[] | select(.type == "welcome")] | length')"
  confirmed="$(printf '%s' "$body" | jq --argjson orderId "$ORDER_ID" '[.notifications[] | select(.type == "order-confirmed" and (.payload.orderId // .payload.order_id // -1) == $orderId)] | length')"

  log "Notifications: welcome=${welcome}, order-confirmed(for order)=${confirmed}"

  (( welcome >= 1 )) || fail "Expected at least one welcome notification"
  if [[ "$FINAL_ORDER_STATUS" == "CONFIRMED" ]]; then
    (( confirmed >= 1 )) || fail "Expected order-confirmed notification for order ${ORDER_ID}"
  fi
}

main() {
  require_cmd curl
  require_cmd jq

  log "Gateway: ${GATEWAY_URL}"
  log "Expected payment result: ${EXPECTED_PAYMENT_RESULT}"

  wait_for_http "${GATEWAY_URL}/health" "$HEALTH_TIMEOUT" "api-gateway /health"

  step_register
  step_login
  step_create_product
  step_wait_for_stock
  step_set_stock
  step_add_to_cart
  step_checkout
  step_poll_order
  step_assert_outcome
  step_check_notifications

  log "E2E checkout smoke PASSED (order ${ORDER_ID} → ${FINAL_ORDER_STATUS})"
}

main "$@"
