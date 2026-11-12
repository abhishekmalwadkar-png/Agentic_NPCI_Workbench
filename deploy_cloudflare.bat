@echo off
title NPCI Workbench - Cloudflare Pages Deployment
color 0B
echo ======================================================================
echo    AutomationEdge ^| NPCI Operations Workbench
echo    Deploying UI to Cloudflare Pages (*.pages.dev)
echo ======================================================================
echo.

cd /d "%~dp0stage1-ui"

:: Step 1: Check authentication
echo [1/3] Checking Cloudflare credentials...
call npx wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] You are not logged in to Cloudflare yet.
    echo A browser window will now open to authorize Cloudflare.
    echo Please log in and click "Allow" in your browser.
    echo.
    call npx wrangler login
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Authentication was not completed.
        echo You can also set your API token by running:
        echo   set CLOUDFLARE_API_TOKEN=your_token_here
        echo.
        pause
        exit /b 1
    )
)

:: Step 2: Build production bundle
echo.
echo [2/3] Building production assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Please resolve compile errors before deploying.
    pause
    exit /b 1
)

:: Step 3: Deploy to Cloudflare Pages
echo.
echo [3/3] Uploading and deploying to Cloudflare Pages...
call npx wrangler pages deploy dist --project-name=npci-workbench --commit-dirty=true

echo.
echo ======================================================================
echo    DEPLOYMENT COMPLETE!
echo    Your live URL: https://npci-workbench.pages.dev
echo ======================================================================
echo.
pause

