@echo off
title GitHub Sync Helper
cd /d "%~dp0\.."

git init
git add .
git commit -m "feat: render production ready configuration"
git branch -M main

echo.
echo ========================================================
echo [+] Code is staged and committed!
echo [+] Add your remote repo URL below to push:
echo     git remote add origin YOUR_GITHUB_REPO_URL
echo     git push -u origin main
echo ========================================================
pause
