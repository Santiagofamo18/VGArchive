@echo off
cd /d "%~dp0"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo No se encuentra pnpm. Instala Node.js 20.11+ y pnpm desde https://pnpm.io/installation y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\webtorrent\package.json" (
  echo Instalando el motor de torrents WebTorrent...
  call pnpm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call pnpm start
pause
