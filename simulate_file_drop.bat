@echo off
title NPCI Workbench - Inbound Feed Simulator
color 0B
cd /d "%~dp0"

echo ======================================================================
echo    AutomationEdge ^| NPCI Unified Operations Workbench
echo    Inbound Feed Drop Simulator (Auto-Recon Test)
echo ======================================================================
echo.
echo Select payment rail to simulate and drop into 'Input files':
echo.
echo   [1] UPI 2.0 (Subscribed)
echo   [2] IMPS Instant Clearing (Subscribed)
echo   [3] AePS Micro-ATM (Trial Available)
echo   [4] NETC FASTag (Trial Available)
echo   [5] Multi-Rail Unified 4-Leg Feeds
echo.
set /p railchoice="Enter choice (1-5) [Default 1]: "

if "%railchoice%"=="2" (
    set TARGET_RAIL=IMPS
) else if "%railchoice%"=="3" (
    set TARGET_RAIL=AEPS
) else if "%railchoice%"=="4" (
    set TARGET_RAIL=NETC
) else if "%railchoice%"=="5" (
    set TARGET_RAIL=UNIFIED
) else (
    set TARGET_RAIL=UPI
)

echo.
set /p rec_count="Enter record count (e.g. 1000, 5000) [Default 2500]: "
if "%rec_count%"=="" set rec_count=2500

echo.
echo ======================================================================
echo Generating and dropping %rec_count% records for rail '%TARGET_RAIL%'...
echo ======================================================================

python tools\simulator.py --rail %TARGET_RAIL% --records %rec_count%

echo.
echo Calling Simulator Endpoint to notify watcher...
powershell -Command "try { (Invoke-RestMethod -Uri 'http://localhost:8000/api/simulator/drop-feed?rail=%TARGET_RAIL%&record_count=%rec_count%' -Method Post) | ConvertTo-Json } catch { Write-Host 'Backend offline or busy' }"

echo.
echo ======================================================================
echo File drop completed! Check Workbench UI or Backend logs for Recon run.
echo ======================================================================
echo.
pause
