@echo off
title AutomationEdge - Custom Domain Setup
color 0A

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ======================================================================
    echo    Requesting Administrator privileges to update Windows hosts file...
    echo ======================================================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set HOSTS_FILE=%WINDIR%\System32\drivers\etc\hosts

findstr /i "automationedgeagentic" "%HOSTS_FILE%" >nul 2>&1
if %errorlevel% neq 0 (
    echo.>> "%HOSTS_FILE%"
    echo 127.0.0.1  automationedgeagentic>> "%HOSTS_FILE%"
    echo [SUCCESS] Added "127.0.0.1  automationedgeagentic" to %HOSTS_FILE%
) else (
    echo [INFO] "automationedgeagentic" already exists in %HOSTS_FILE%
)

echo.
echo You can now access the workbench directly at:
echo http://automationedgeagentic:5173
echo.
timeout /t 3 /nobreak >nul

