@echo off
setlocal
cd /d "%~dp0"

echo Starting Suzuki Auto Silang with account and order services...
echo When the server is ready, open http://localhost:3000
echo Keep this window open while using the website.
echo Press Ctrl+C to stop the server.

call npm.cmd run start:local
if errorlevel 1 (
  echo.
  echo Startup stopped with an error. Review the output above.
  pause
)
