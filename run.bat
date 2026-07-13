@echo off
REM Twist7 - Start the dev server (http://localhost:5173)
cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo Installing dependencies...
    call npm install
)

echo Starting Twist7...
call npm run dev
pause
