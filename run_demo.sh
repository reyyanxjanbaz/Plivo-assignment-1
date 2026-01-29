#!/bin/bash

# Kill any existing node process on port 3000
echo "🧹 Cleaning up port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start localtunnel in background
echo "🚀 Starting tunnel..."
rm -f tunnel.log
npx localtunnel --port 3000 > tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel to initialize
sleep 4

# Extract URL from log
URL=$(grep -o "https://[a-zA-Z0-9-]*\.loca\.lt" tunnel.log | head -1)

if [ -z "$URL" ]; then
    echo "❌ Failed to get tunnel URL. Please check your internet connection or try again."
    cat tunnel.log
    kill $TUNNEL_PID
    exit 1
fi

echo "✅ Tunnel URL: $URL"

# Update .env file automatically (BSD sed for macOS)
sed -i '' "s|BASE_URL=.*|BASE_URL=$URL|g" .env

echo "✅ Updated .env configuration"
echo "✅ Starting Server..."
echo "================================================="
echo "   SEND CALLS TO:"
echo "   curl -X POST http://localhost:3000/call \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"to\": \"DESTINATION_NUMBER\"}'"
echo "================================================="

# Start the server
node server.js

# Cleanup on exit
kill $TUNNEL_PID
