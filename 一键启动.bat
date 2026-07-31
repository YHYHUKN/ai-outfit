@echo off
setlocal
cd /d "%~dp0"

REM ---- Resolve node executable ----
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
  ) else (
    echo [ERROR] Node.js not found. Please install Node.js or add it to PATH.
    echo Then double-click this script again.
    pause
    exit /b 1
  )
)

REM ---- Ensure server.js exists ----
if not exist "%~dp0server.js" (
  echo [ERROR] server.js not found in this folder.
  pause
  exit /b 1
)

REM ---- Avoid starting a second server if port 3000 is already listening ----
set PORT_BUSY=0
netstat -ano 2>nul | findstr /C:":3000" | findstr /C:"LISTENING" >nul && set PORT_BUSY=1

if "%PORT_BUSY%"=="0" (
  echo Starting AI outfit tool server on http://localhost:3000 ...
  start "AIOutfitServer" "%NODE_EXE%" "%~dp0server.js"
  timeout /t 3 >nul
) else (
  echo Server already running on http://localhost:3000
)

echo Opening browser at http://localhost:3000 ...
start "" http://localhost:3000
echo Done. Close the "AIOutfitServer" window to stop the server.
timeout /t 3 >nul
