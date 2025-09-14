#!/bin/bash

# Quick Test Script for Scanner System
# This script helps you quickly test the enhanced scanner functionality

echo "🚀 Quick Test for Enhanced Scanner System"
echo "========================================"

# Check if we're in the right directory
if [ ! -d "scanner" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Node.js/npm is required but not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Step 1: Start Backend (in background)
echo ""
echo "🔧 Starting backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🚀 Starting Convex backend (this will run in background)..."
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Step 2: Test Backend
echo ""
echo "🧪 Testing backend endpoints..."
cd scanner
python3 test_system.py
TEST_RESULT=$?

if [ $TEST_RESULT -ne 0 ]; then
    echo "❌ Backend tests failed"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Step 3: Interactive Scanner Demo
echo ""
echo "🎯 Ready for interactive scanner demo!"
echo ""
echo "The backend is running. You can now:"
echo ""
echo "1. 📱 Set up test devices:"
echo "   - Enable Bluetooth on phones/devices"
echo "   - Set device names to: 'TestPhone-001', 'TestPhone-002', etc."
echo ""
echo "2. 🔍 Run the interactive scanner:"
echo "   python3 scanner.py interactive-scan"
echo ""
echo "3. 📊 Monitor the scanning process"
echo ""
echo "4. 🔄 Sync data when done:"
echo "   python3 scanner.py sync"
echo ""
echo "Press Enter to start the interactive scanner demo, or Ctrl+C to exit..."

# Wait for user input
read -r

echo "🎬 Starting interactive scanner demo..."
echo "   (Press Ctrl+C to stop scanning when done)"
echo ""

# Run interactive scanner
python3 scanner.py interactive-scan

echo ""
echo "🔄 Syncing data to backend..."
python3 scanner.py sync

echo ""
echo "🎉 Demo completed!"
echo ""
echo "To stop the backend, run: kill $BACKEND_PID"
echo "Or find and kill the process manually if needed."

cd ..
