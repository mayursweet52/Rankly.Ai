@echo off
REM =========================================================
REM  Rankly.ai - One-Click Application Launcher
REM =========================================================

setlocal enabledelayedexpansion

REM Change to the application directory
cd /d "%~dp0"

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Check if .env file exists, if not create it
if not exist ".env" (
    echo Creating default .env file...
    (
        echo PORT=3000
        echo OLLAMA_URL=http://localhost:11434
        echo OLLAMA_MODEL=llama3.2:3b
        echo API_KEY=rankly-secret-key
    ) > .env
)

REM Start the application
echo.
echo =========================================================
echo  Starting Rankly.ai Server...
echo =========================================================
echo.
echo Server will run at: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.

call node server.js

REM Pause so the window doesn't close immediately on error
pause
