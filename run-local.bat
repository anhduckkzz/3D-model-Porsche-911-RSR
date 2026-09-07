@echo off
setlocal
cd /d "%~dp0"

echo Starting Porsche 911 RSR local controller...

python -c "import bleak, websockets" >nul 2>nul
if errorlevel 1 (
  echo Installing local Bluetooth requirements...
  python -m pip install -r controller\requirements.txt || goto :error
)

if not exist node_modules\ (
  echo Installing web dependencies...
  call npm install || goto :error
)

start "Porsche BLE Controller" /min cmd /c "python controller\bridge.py"
start "Porsche Web" /min cmd /c "npm run dev"

timeout /t 4 /nobreak >nul
start "" http://localhost:3000
exit /b 0

:error
echo.
echo Could not start the local Porsche controller.
pause
exit /b 1
