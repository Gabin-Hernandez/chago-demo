#!/bin/bash

# Script para probar el endpoint de arrastre automático
# Uso: ./test-carryover-endpoint.sh [URL_BASE] [CRON_SECRET]

# Configuración por defecto
BASE_URL=${1:-"http://localhost:3000"}
CRON_SECRET=${2:-""}

echo "🧪 Testing Carryover Cronjob Endpoint"
echo "======================================"
echo "Base URL: $BASE_URL"
echo "CRON Secret: ${CRON_SECRET:+"***configured***"}"
echo ""

# Test 1: POST sin autenticación (modo desarrollo)
echo "📋 Test 1: POST request (development mode)"
curl -X POST "$BASE_URL/api/cron/calculate-carryover" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq . 2>/dev/null || echo "Response not JSON format"
echo ""

# Test 2: POST con autenticación (si se proporciona secret)
if [ -n "$CRON_SECRET" ]; then
  echo "📋 Test 2: POST request (production mode with auth)"
  curl -X POST "$BASE_URL/api/cron/calculate-carryover" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq . 2>/dev/null || echo "Response not JSON format"
  echo ""
fi

# Test 3: GET request (debe fallar)
echo "📋 Test 3: GET request (should fail with 405)"
curl -X GET "$BASE_URL/api/cron/calculate-carryover" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq . 2>/dev/null || echo "Response not JSON format"
echo ""

# Test 4: POST sin autorización cuando se requiere (si está en producción)
if [ -n "$CRON_SECRET" ]; then
  echo "📋 Test 4: POST without auth (should fail with 401)"
  curl -X POST "$BASE_URL/api/cron/calculate-carryover" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq . 2>/dev/null || echo "Response not JSON format"
  echo ""
fi

echo "✅ Tests completed!"
echo ""
echo "Expected results:"
echo "- Test 1: HTTP 200, success: true (development mode)"
echo "- Test 2: HTTP 200, success: true (production mode)"
echo "- Test 3: HTTP 405, Method not allowed"
echo "- Test 4: HTTP 401, Unauthorized"
