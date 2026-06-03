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
  echo This is okay. The app will start in local-only mode.
  echo Copy .env.example to .env.local only if you want optional Manager Brain or CRM bridge settings.
  echo.
)

echo Starting AI Department Command Center...
python ".\swiss_planner_command_center\server.py"

echo.
echo Command Center stopped.
pause
