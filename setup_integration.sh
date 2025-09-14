#!/bin/bash

# Setup Integration Script
# This script helps set up the scanner integration with admin and mobile apps

echo "🚀 Setting up Attendance Tracking System Integration"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend/convex/schema.ts" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Dependencies check passed"

# Setup backend
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🚀 Starting Convex development server..."
echo "   This will deploy your backend and provide the HTTP URL"
echo "   Press Ctrl+C to stop when you have the URL"
echo ""

# Start Convex dev in background
npx convex dev &
CONVEX_PID=$!

# Wait a moment for Convex to start
sleep 5

echo ""
echo "📋 Next steps:"
echo "1. Note the Convex HTTP URL from the output above"
echo "2. Copy the URL and update the scanner configuration"
echo "3. Update the mobile app environment variables"
echo "4. Test the integration using: node test_integration.js"
echo ""
echo "🔧 Scanner Configuration:"
echo "   - Backend URL: [Your Convex HTTP URL]"
echo "   - API Key: [Create one in your backend]"
echo "   - Event ID: [Name of your event]"
echo ""
echo "📱 Mobile App Configuration:"
echo "   - Update EXPO_PUBLIC_CONVEX_URL in mobile/.env"
echo ""
echo "Press Ctrl+C to stop the Convex server when done"

# Wait for user to stop
wait $CONVEX_PID
