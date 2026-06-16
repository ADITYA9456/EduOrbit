@echo off
REM ============================================================
REM  EduOrbit - One-click setup for Windows
REM  Double-click this file (or run it in cmd) to get started.
REM ============================================================

echo.
echo ===== EduOrbit setup (Windows) =====
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Download the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo Node version:
node -v
echo.

echo Removing any old / corrupted dependencies...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next

echo.
echo Installing dependencies (this can take a few minutes)...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed. Check the messages above.
  pause
  exit /b 1
)

echo.
echo ===== Done! Starting the dev server... =====
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop.
echo.
call npm run dev
pause
