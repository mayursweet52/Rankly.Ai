@echo off
title Rankly.ai Enterprise Launcher (Public Mode)
color 0A
cls

echo ====================================================================
echo               STARTING RANKLY.AI WITH GLOBAL ACCESS                 
echo ====================================================================
echo.

:: 1. Start Ollama AI Engine if not running
echo [1/3] Checking Ollama AI Service...
netstat -ano | findstr :11434 >nul 2>&1
if %errorlevel% neq 0 (
    echo [+] Starting local Ollama background daemon...
    start /min "Ollama AI" ollama serve
    timeout /t 2 /nobreak >nul
) else (
    echo [+] Ollama AI is already active.
)

:: 2. Start Web / Backend Server
echo.
echo [2/3] Starting Rankly Backend Server (0.0.0.0:3000)...
start "Rankly Backend Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

:: 3. Start Public Localtunnel with Subdomain
echo.
echo [3/3] Generating Public Web Link...
echo.
echo --------------------------------------------------------------------
echo  Your Public URL will be: https://rankly.loca.lt
echo --------------------------------------------------------------------
npx localtunnel --port 3000 --subdomain rankly
