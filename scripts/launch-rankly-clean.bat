@echo off
title Rankly.ai Clean Launcher (Port 80)
color 0B

:: Check for Administrative Permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Elevating to Administrator to bind clean URL (Port 80)...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0\.."

echo ======================================================
echo           STARTING RANKLY.AI ON HTTP://RANKLY.AI      
echo ======================================================

:: 1. Start Ollama AI if not running
netstat -ano | findstr :11434 >nul 2>&1
if %errorlevel% neq 0 (
    start /min "Ollama AI" ollama serve
    timeout /t 2 /nobreak >nul
)

:: 2. Start Backend on Port 80
start "Rankly Clean Engine" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

:: 3. Launch clean browser URL
start http://rankly.ai

exit
