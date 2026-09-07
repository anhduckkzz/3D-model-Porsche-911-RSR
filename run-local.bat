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

rem This machine is dedicated to the project. Always clear stale listeners first.
rem Otherwise Next.js may silently move to 3001 while the browser keeps opening
rem an old app on 3000, and an old bridge may still own 8765.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=3000,8765; Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue ^| Where-Object { $ports -contains $_.LocalPort } ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>nul
timeout /t 1 /nobreak >nul

rem Keep logs so a failed one-button connection can be diagnosed without any config UI.
> controller\bridge.log echo [%date% %time%] starting bridge
> controller\web.log echo [%date% %time%] starting web
start "Porsche BLE Controller" /min cmd /c "python -u controller\bridge.py >> controller\bridge.log 2>&1"
start "Porsche Web" /min cmd /c "npm run dev >> controller\web.log 2>&1"

rem Wait until both local services are actually listening before opening the page.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(25); do { $web=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; $ble=Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue; if($web -and $ble){ exit 0 }; Start-Sleep -Milliseconds 250 } while((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 goto :startup_error

start "" http://localhost:3000
exit /b 0

:startup_error
echo.
echo Local services did not start correctly.
echo Open controller\bridge.log and controller\web.log for the exact error.
pause
exit /b 1

:error
echo.
echo Could not start the local Porsche controller.
pause
exit /b 1
