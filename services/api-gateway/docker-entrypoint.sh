#!/bin/sh
set -e

# Substitute RATE_LIMIT_* vars into nginx.conf
envsubst '${RATE_LIMIT_MUT} ${RATE_LIMIT_READ}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

# Start the Node.js JWT middleware in the background
PORT=3001 node dist/main.js &

# Start Nginx in the foreground (PID 1)
exec nginx -g 'daemon off;'
