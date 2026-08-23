@echo off
REM =========================================================
REM  Rankly.ai - Complete Setup & Installation Script
REM =========================================================
REM Run this script once to set everything up

setlocal enabledelayedexpansion

echo.
echo =========================================================
echo  Rankly.ai - Setup & Installation
echo =========================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: This script works best when run as Administrator
    echo You can still continue, but some features may be limited.
    echo.
)

REM Current directory
set "APPDIR=%~dp0"

echo Step 1: Checking Node.js installation...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set "NODEVERSION=%%i"
echo   Found Node.js: %NODEVERSION%
echo.

echo Step 2: Installing dependencies...
cd /d "%APPDIR%"
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo   Dependencies installed successfully!
echo.

echo Step 3: Creating default .env file...
if not exist ".env" (
    (
        echo PORT=3000
        echo OLLAMA_URL=http://localhost:11434
        echo OLLAMA_MODEL=llama3.2:3b
        echo API_KEY=rankly-secret-key
    ) > .env
    echo   Default .env created. Please update API_KEY for production!
) else (
    echo   .env file already exists (skipping)
)
echo.

echo Step 4: Creating Desktop shortcut...
REM Create desktop shortcut using PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $DesktopPath = [Environment]::GetFolderPath('Desktop'); ^
    $ShortcutPath = Join-Path $DesktopPath 'Rankly.ai.lnk'; ^
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath); ^
    $Shortcut.TargetPath = '%APPDIR%start.bat'; ^
    $Shortcut.WorkingDirectory = '%APPDIR%'; ^
    $Shortcut.IconLocation = 'C:\Windows\System32\shell32.dll,2'; ^
    $Shortcut.Description = 'Rankly.ai - Executive OS'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save(); ^
    Write-Host '   Desktop shortcut created!'
"
echo.

echo Step 5: Verifying installation...
if exist "server.js" if exist "package.json" if exist "start.bat" (
    echo   All files verified!
) else (
    echo   WARNING: Some files are missing
)
echo.

echo.
echo =========================================================
echo  Setup Complete!
echo =========================================================
echo.
echo You can now:
echo   1. Double-click the "Rankly.ai" shortcut on your Desktop
echo   2. OR run: start.bat from this folder
echo   3. Open your browser to: http://localhost:3000
echo.
echo To stop the server, close the terminal window or press Ctrl+C
echo.
echo =========================================================
echo.

pause
