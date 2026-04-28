#!/usr/bin/env bash
set -euo pipefail

envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 --timeout 120 --chdir backend app:app &
GUNICORN_PID=$!

READY=0
for _ in $(seq 1 60); do
  if ! kill -0 "$GUNICORN_PID" 2>/dev/null; then
    echo "Gunicorn exited before it became ready."
    wait "$GUNICORN_PID"
    exit 1
  fi

  if bash -c 'echo > /dev/tcp/127.0.0.1/5000' 2>/dev/null; then
    READY=1
    break
  fi

  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "Gunicorn did not become ready within 60 seconds."
  kill "$GUNICORN_PID" 2>/dev/null || true
  wait "$GUNICORN_PID" 2>/dev/null || true
  exit 1
fi

nginx -g 'daemon off;' &
NGINX_PID=$!

set +e
wait -n "$GUNICORN_PID" "$NGINX_PID"
EXIT_CODE=$?

kill "$GUNICORN_PID" "$NGINX_PID" 2>/dev/null || true
wait "$GUNICORN_PID" 2>/dev/null || true
wait "$NGINX_PID" 2>/dev/null || true

exit "$EXIT_CODE"
