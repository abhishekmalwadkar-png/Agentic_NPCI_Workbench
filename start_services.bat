@echo off
title NPCI Unified Operations Workbench - Services ^& Cloudflare Live Tunnel
color 0B
cd /d "%~dp0"

echo ======================================================================
echo    AutomationEdge ^| NPCI Unified Operations Workbench
echo    Starting Services ^& Generating Cloudflare Live Public URL...
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_tunnel.ps1"
