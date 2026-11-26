@echo off
setlocal
cd /d "%~dp0"

echo Starting Suzuki Auto Silang...
echo Keep this window open while using the site.
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop the server.

call npm.cmd run start:local
if errorlevel 1 (
  echo.
  echo Startup stopped with an error. Review the output above.
  pause
)
