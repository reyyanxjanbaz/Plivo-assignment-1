#!/bin/bash

# Plivo IVR Demo - Quick Setup Script
# This script helps you get started quickly

echo "========================================"
echo "Plivo IVR Demo - Quick Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
    echo ""
    echo "You need to set:"
    echo "  - PLIVO_AUTH_ID"
    echo "  - PLIVO_AUTH_TOKEN"
    echo "  - PLIVO_PHONE_NUMBER"
    echo "  - BASE_URL (your ngrok URL)"
    echo ""
else
    echo "✅ .env file exists"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
    echo ""
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env file with your Plivo credentials:"
echo "   nano .env"
echo ""
echo "2. Start ngrok in a separate terminal:"
echo "   ngrok http 3000"
echo ""
echo "3. Copy the ngrok HTTPS URL and update BASE_URL in .env"
echo ""
echo "4. Start the server:"
echo "   npm start"
echo ""
echo "5. Make a test call:"
echo "   curl -X POST http://localhost:3000/call \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"to\": \"YOUR_PHONE_NUMBER\"}'"
echo ""
echo "========================================"
