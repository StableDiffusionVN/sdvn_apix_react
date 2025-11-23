#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Starting aPix Setup for Mac..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "📦 Installing Frontend Dependencies..."
npm install

echo "📦 Installing Backend Dependencies..."
cd server
npm install
cd ..

echo "✅ Setup Complete!"
echo "🚀 Launching aPix..."

npm run dev:all
