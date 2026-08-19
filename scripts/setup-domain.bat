@echo off
title Rankly.ai Domain & Port 80 Proxy Setup
color 0B
cls

:: Check for Administrative Permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Requesting Administrator privileges to configure domain & port proxy...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ====================================================================
echo        CONFIGURING PURE DOMAIN & PORT PROXY: HTTP://RANKLY.AI       
echo ====================================================================
echo.

:: 1. MAP HOSTS ENTRY
set HOSTS_PATH=%WINDIR%\System32\drivers\etc\hosts
findstr /C:"rankly.ai" "%HOSTS_PATH%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] rankly.ai domain is already mapped in hosts file.
) else (
    echo. >> "%HOSTS_PATH%"
    echo # Rankly AI Local Domain >> "%HOSTS_PATH%"
    echo 127.0.0.1 rankly.ai www.rankly.ai >> "%HOSTS_PATH%"
    echo [+] Successfully mapped rankly.ai to 127.0.0.1 in hosts file!
)

:: 2. CONFIGURE WINDOWS KERNEL PORT PROXY (Port 80 -> Port 3000)
echo.
echo [+] Configuring Windows Kernel Port Forwarding (80 -> 3000)...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=3000 connectaddress=127.0.0.1
if %errorlevel% equ 0 (
    echo [+] Port proxy configured: 127.0.0.1:80 -> 127.0.0.1:3000 successfully!
) else (
    echo [!] Warning: Failed to set port proxy.
)

:: 3. FLUSH DNS CACHE
echo.
echo [+] Flushing DNS cache...
ipconfig /flushdns >nul
echo [+] DNS cache flushed successfully.

echo.
echo ====================================================================
echo ✅ SETUP COMPLETE! 
echo 👉 You can now open: http://rankly.ai (without typing :3000)
echo ====================================================================
echo.
pause
