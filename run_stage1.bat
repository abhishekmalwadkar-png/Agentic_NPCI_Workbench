@echo off
title NPCI Unified Operations Workbench - Service Launcher
color 0B
echo ======================================================================
echo    AutomationEdge ^| NPCI Unified Operations Workbench
echo    Starting All Services (FastAPI Backend + React Control Tower)
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "NPCI Backend - FastAPI [Port 8000]" cmd /k "cd /d "%~dp0stage1\backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting React Control Tower UI on http://localhost:5173 ...
start "NPCI Frontend - Vite [Port 5173]" cmd /k "cd /d "%~dp0stage1-ui" && npm run dev"

echo.
echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Launching Dashboard in browser...
start http://automationedgeagentic:5173 2>nul || start http://localhost:5173

echo.
echo ======================================================================
echo    ALL SERVICES STARTED SUCCESSFULLY!
echo    * Custom Brand URL:    http://automationedgeagentic:5173
echo    * Fallback URL:        http://localhost:5173
echo    * AE Agentic Flow:     Default View
echo    * FastAPI REST Docs:   http://localhost:8000/docs
echo ======================================================================
echo.
pause >nul
