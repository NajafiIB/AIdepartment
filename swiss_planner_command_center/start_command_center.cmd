@echo off
setlocal

cd /d "%~dp0\.."

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found.
  echo Install Python 3.10 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo.
  echo No .env.local file was found.
  echo Copy .env.example to .env.local and fill SWISS_PLANNER_WEBHOOK_URL and SWISS_PLANNER_WEBHOOK_TOKEN.
  echo The app can also read those values from Windows user environment variables.
  echo.
)

echo Starting AI Department Command Center...
python ".\swiss_planner_command_center\server.py"

echo.
echo Command Center stopped.
pause
