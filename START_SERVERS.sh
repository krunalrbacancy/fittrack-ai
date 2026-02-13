#!/bin/bash

# FitTrack AI - Start Script
# This script helps you start both backend and frontend servers

echo "🚀 FitTrack AI - Starting Servers"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Function to start backend
start_backend() {
    echo "📦 Starting Backend Server..."
    cd server
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing backend dependencies..."
        npm install
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo "⚠️  .env file not found. Creating from env.example..."
        cp env.example .env
        echo "⚠️  Please edit server/.env and add your MongoDB connection string!"
        echo "⚠️  Then run this script again."
        exit 1
    fi
    
    echo "✅ Backend starting on http://localhost:5000"
    npm run dev
}

# Function to start frontend
start_frontend() {
    echo "📦 Starting Frontend Server..."
    cd client
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing frontend dependencies..."
        npm install
    fi
    
    echo "✅ Frontend starting on http://localhost:3000"
    npm run dev
}

# Check command line argument
if [ "$1" == "backend" ]; then
    start_backend
elif [ "$1" == "frontend" ]; then
    start_frontend
else
    echo "Usage:"
    echo "  ./START_SERVERS.sh backend   - Start backend only"
    echo "  ./START_SERVERS.sh frontend  - Start frontend only"
    echo ""
    echo "To start both, open TWO terminals:"
    echo "  Terminal 1: ./START_SERVERS.sh backend"
    echo "  Terminal 2: ./START_SERVERS.sh frontend"
    echo ""
    echo "Or manually:"
    echo "  Terminal 1: cd server && npm run dev"
    echo "  Terminal 2: cd client && npm run dev"
fi

