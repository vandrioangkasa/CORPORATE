@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js belum tersedia di PATH.
  pause
  exit /b 1
)
set "CORPORATE_DESK_PORT=3847"
start "" /b powershell.exe -NoProfile -Command "for ($i = 0; $i -lt 30; $i++) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3847/' -TimeoutSec 1; if ($response.Content -like '*Corporate Agent Desk*') { Start-Process 'http://127.0.0.1:3847/'; break } } catch {}; Start-Sleep -Milliseconds 300 }"
echo Biarkan jendela ini terbuka selama memakai aplikasi.
node server.mjs
pause
