#!/usr/bin/env bash
set -e

# केवल लोकल होस्ट पर चलाने के लिए configuration
LOCAL_HOST="127.0.0.1"

echo "Using host: $LOCAL_HOST"

# backend configuration
export PORT=5000
export HOST=0.0.0.0

# admin के लिए fixed localhost URL
export VITE_API_URL="http://$LOCAL_HOST:5000/api"

# 4) backend रन करें (अलग टर्म में, या background)
(
  cd "$(dirname "$0")/.."/backend && 
  echo "Starting backend at http://0.0.0.0:$PORT" && 
  npm run dev 
) &
BACKEND_PID=$!

echo "Backend started [PID=$BACKEND_PID]"

# 5) admin रन करें
(
  cd "$(dirname "$0")/.."/admin && 
  echo "Starting admin (VITE_API_URL=$VITE_API_URL)" && 
  VITE_API_URL="$VITE_API_URL" npm run dev
)

# 6) cleanup (backend background) signal handle
trap "echo 'Stopping backend'; kill $BACKEND_PID; exit 0" SIGINT SIGTERM
wait
