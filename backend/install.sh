#!/bin/bash

echo "🛠️  Starting Syspectrum Backend Installation..."

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install it before continuing."
  exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed. Please install it before continuing."
  exit 1
fi

# Install node modules
echo "📦 Installing Node modules..."
npm install

# Ensure screen is installed
if ! command -v screen &> /dev/null; then
  echo "🔍 'screen' not found, attempting to install..."
  if command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y screen
  elif command -v yum &> /dev/null; then
    sudo yum install -y screen
  elif command -v dnf &> /dev/null; then
    sudo dnf install -y screen
  elif command -v apk &> /dev/null; then
    sudo apk add screen
  elif command -v pacman &> /dev/null; then
    sudo pacman -Sy --noconfirm screen
  else
    echo "⚠️ Could not detect package manager. Please install 'screen' manually."
  fi
fi

# Make scripts executable
chmod +x start.sh stop.sh

echo "✅ Installation complete. Use './start.sh' to run the backend in the background."
