@echo off
title Rankly.ai Global Public Access
color 0A
cls

echo ====================================================================
echo             RANKLY.AI GLOBAL INTERNET ACCESS (LOCALTUNNEL)          
echo ====================================================================
echo.

:: 1. Check if Node.js server is already running
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo [+] Starting Rankly Backend Server...
    start "Rankly Backend" cmd /k "node server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo [+] Rankly Backend Server is already active on port 3000.
)

:: 2. Launch Localtunnel
echo.
echo [+] Initializing secure public internet tunnel for port 3000...
echo [+] Copy the public URL below to access Rankly.ai from any device globally:
echo --------------------------------------------------------------------
npx localtunnel --port 3000
