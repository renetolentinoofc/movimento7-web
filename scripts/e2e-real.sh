#!/usr/bin/env bash
set -euo pipefail

api_url="${INTERNAL_API_URL:-http://127.0.0.1:5000}"
health_url="${api_url%/}/api/v1/health/live"

if ! curl --fail --silent --show-error "$health_url" >/dev/null; then
  echo "API E2E indisponível em $health_url" >&2
  exit 1
fi

export E2E_REAL=1
exec npx playwright test "$@"
