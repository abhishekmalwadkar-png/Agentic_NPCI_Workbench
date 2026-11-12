@echo off
title NPCI Operations Workbench - Live Cloudflare Session
color 0B
cls
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_tunnel.ps1"
pause
