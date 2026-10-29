@echo off
title NPCI Unified Workbench - Stage 1 Launcher
echo =======================================================
echo   NPCI Unified Operations Workbench - Stage 1
echo   File Monitoring, Ingestion & Validation Layer
echo =======================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "NPCI Stage 1 Backend (FastAPI)" cmd /k "cd /d d:\NPCI-Workbench\stage1\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting React Control Tower UI on http://localhost:5173 ...
start "NPCI Stage 1 Frontend (Vite)" cmd /k "cd /d d:\NPCI-Workbench\stage1-ui && npm run dev"

echo.
echo =======================================================
echo   Services are starting!
echo   - Backend API Docs:   http://localhost:8000/docs
echo   - Control Tower UI:   http://localhost:5173
echo =======================================================
echo.
pause
