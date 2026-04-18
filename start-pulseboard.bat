@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

if not exist "package.json" (
  echo package.json not found in:
  echo %PROJECT_DIR%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ready = $false; " ^
  "try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready = $true } catch {}; " ^
  "if (-not $ready) { Start-Process cmd -ArgumentList '/k','cd /d ""%PROJECT_DIR%"" ^&^& npm run dev' -WindowStyle Normal; " ^
  "for ($i = 0; $i -lt 45 -and -not $ready; $i++) { Start-Sleep -Seconds 1; try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready = $true } catch {} } }; " ^
  "if ($ready) { Start-Process 'http://localhost:5173' } else { Write-Host 'Dev server did not become ready in time.' }"

if errorlevel 1 (
  echo Failed to launch Market Pulse Board.
  pause
  exit /b 1
)

endlocal
