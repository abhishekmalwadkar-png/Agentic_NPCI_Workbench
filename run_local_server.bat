@echo off
title NPCI Unified Operations Workbench - Local Server Launcher
color 0B
echo ======================================================================
echo    AutomationEdge ^| NPCI Unified Operations Workbench
echo    Starting Local Server (FastAPI Backend + React Frontend)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Start FastAPI Backend on Port 8000
echo [1/2] Starting Python FastAPI Backend on http://localhost:8000 ...
start "NPCI Backend - FastAPI [Port 8000]" cmd /k "cd /d "%~dp0stage1\backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Start React Vite Frontend on Port 5173
echo [2/2] Starting React Workbench UI on http://localhost:5173 ...
start "NPCI Frontend - Vite [Port 5173]" cmd /k "cd /d "%~dp0stage1-ui" && npm run dev"

echo.
echo Waiting 4 seconds for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ======================================================================
echo    LOCAL SERVER IS RUNNING!
echo.
echo    * React Workbench UI:   http://localhost:5173
echo    * FastAPI Backend:      http://localhost:8000
echo    * API Documentation:    http://localhost:8000/docs
echo ======================================================================
echo.
echo Press any key to exit this launcher (services will stay running).
pause >nul

