@echo off
title NPCI Unified Operations Workbench - Service Launcher
color 0B
echo ======================================================================
echo    AutomationEdge ^| NPCI Unified Operations Workbench
echo    Starting All Services (FastAPI Backend + React Control Tower)
echo ======================================================================
echo.

:: 1. Navigate to Workbench Root
cd /d "%~dp0"

:: 2. Start FastAPI Backend on Port 8000 in a dedicated window
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "NPCI Backend - FastAPI [Port 8000]" cmd /k "cd /d "%~dp0stage1\backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: 3. Start React Frontend Dashboard on Port 5173 in a dedicated window
echo [2/2] Starting React Control Tower UI on http://localhost:5173 ...
start "NPCI Frontend - Vite [Port 5173]" cmd /k "cd /d "%~dp0stage1-ui" && npm run dev"

:: 4. Wait briefly for servers to initialize
echo.
echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

:: 5. Open Default Browser directly to AE_AgenticFlow Dashboard
echo Launching Dashboard in browser...
start http://localhost:5173

echo.
echo ======================================================================
echo    ALL SERVICES STARTED SUCCESSFULLY!
echo.
echo    * React Dashboard:     http://localhost:5173
echo    * AE Agentic Flow:     http://localhost:5173 (Default Tab)
echo    * FastAPI REST Docs:   http://localhost:8000/docs
echo    * AE Server Watcher:   Active (t4.automationedge.com)
echo ======================================================================
echo.
echo Press any key to close this launcher window (services will stay running).
pause >nul

