@echo off
setlocal
cd /d "%~dp0"

echo Starting Porsche 911 RSR...

if not exist node_modules\ (
  echo Installing web dependencies...
  call npm install || goto :error
)

rem The car now connects directly from Chrome/Edge through Web Bluetooth.
rem No Python BLE bridge is required.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do taskkill /PID %%p /F >nul 2>nul
timeout /t 1 /nobreak >nul

start "Porsche Web" /min cmd /c "npm run dev"

for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000 -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>nul && goto :ready
  timeout /t 1 /nobreak >nul
)

echo Web app did not become ready on port 3000.
goto :error

:ready
start "" http://localhost:3000
exit /b 0

:error
echo.
echo Could not start the Porsche web app.
pause
exit /b 1
