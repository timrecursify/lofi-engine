#!/bin/bash

echo "🎵 Starting Lo-Fi + Voice Demo..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the lofi-engine directory."
    echo "   Try: cd lofi-engine && ./start-demo.sh"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting development server..."
echo ""
echo "Demo will be available at:"
echo "   Original App: http://localhost:1420/"
echo "   Demo Page:    http://localhost:1420/?demo=true"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
npm run dev 