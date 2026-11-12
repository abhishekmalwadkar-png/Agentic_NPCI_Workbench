@echo off
title NPCI Operations Workbench - Cloudflare Live Tunnel
color 0B
echo ======================================================================
echo    AutomationEdge ^| NPCI Operations Workbench
echo    Starting Cloudflare Live Tunnel (Frontend + Backend)
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Verifying Local Services...
echo  - React UI:        http://localhost:5173
echo  - FastAPI Backend: http://localhost:8000 (proxied via Vite /api)
echo.

echo [2/2] Launching Cloudflare Tunnel...
echo.
echo ======================================================================
echo  Look below for your temporary public URL (ends with .trycloudflare.com)
echo  Example:  https://your-random-words.trycloudflare.com
echo  Press Ctrl+C anytime to stop sharing.
echo ======================================================================
echo.

"%~dp0tools\cloudflared.exe" tunnel --url http://localhost:5173

