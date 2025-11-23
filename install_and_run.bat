@echo off
cd /d "%~dp0"

echo 🚀 Starting aPix Setup for Windows...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo 📦 Installing Frontend Dependencies...
call npm install

echo 📦 Installing Backend Dependencies...
cd server
call npm install
cd ..

echo ✅ Setup Complete!
echo 🚀 Launching aPix...

call npm run dev:all
pause
