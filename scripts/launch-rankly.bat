@echo off
title Rankly.ai Desktop Engine
color 0B
cls

echo ====================================================================
echo                   RANKLY.AI ENTERPRISE ECOSYSTEM                   
echo ====================================================================
echo.

:: 1. CHECK & START LOCAL OLLAMA SERVICE
echo [1/3] Verifying AI Inference Service (Ollama)...
netstat -ano | findstr :11434 >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ollama is not running. Initializing background daemon...
    start /min "Ollama AI Daemon" ollama serve
    timeout /t 2 /nobreak >nul
    echo [+] Ollama service started successfully on port 11434.
) else (
    echo [+] Ollama service is already active on port 11434.
)

:: 2. CHECK & START NODE.JS SERVER
echo.
echo [2/3] Initializing Rankly.ai Backend & Web Server...
netstat -ano | findstr :80 >nul 2>&1
if %errorlevel% neq 0 (
    netstat -ano | findstr :3000 >nul 2>&1
    if %errorlevel% neq 0 (
        start "Rankly Backend Server" cmd /k "node server.js"
        echo [+] Node server process initiated.
    ) else (
        echo [+] Web server is already running on port 3000.
    )
) else (
    echo [+] Web server is already running on port 80.
)

:: 3. HEALTH BUFFER & BROWSER LAUNCH
echo.
echo [3/3] Opening Rankly.ai in default browser...
timeout /t 3 /nobreak >nul
start http://rankly.ai

echo.
echo ====================================================================
echo [+] Application launched successfully on http://rankly.ai!
echo ====================================================================
