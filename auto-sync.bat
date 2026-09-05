@echo off
:loop
git pull origin main
timeout /t 300 >nul
goto loop

