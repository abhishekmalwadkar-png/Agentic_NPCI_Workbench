$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot

# 1. Verify / Start Backend
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $port8000) {
    Write-Host "[1/2] Starting Python FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
    $backendDir = Join-Path $root "stage1\backend"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$backendDir`" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/2] Python FastAPI Backend is active on Port 8000." -ForegroundColor Green
}

# 2. Verify / Start Frontend
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if (-not $port5173) {
    Write-Host "[2/2] Starting React Workbench UI (Port 5173)..." -ForegroundColor Yellow
    $frontendDir = Join-Path $root "stage1-ui"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$frontendDir`" && npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[2/2] React Workbench UI is active on Port 5173." -ForegroundColor Green
}

Write-Host ""
Write-Host "Connecting to Cloudflare Edge Network..." -ForegroundColor Cyan

# 3. Start Tunnel and isolate noisy logs
$logFile = Join-Path $PSScriptRoot "tunnel.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }

$cloudflared = Join-Path $PSScriptRoot "cloudflared.exe"
$proc = Start-Process -FilePath $cloudflared -ArgumentList "tunnel --url http://localhost:5173" -RedirectStandardError $logFile -PassThru -NoNewWindow

$tunnelUrl = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 400
    if (Test-Path $logFile) {
        $match = Get-Content $logFile -ErrorAction SilentlyContinue | Select-String -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
        if ($match) {
            $tunnelUrl = $match.Matches[0].Value
            break
        }
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   AUTOMATIONEDGE | NPCI OPERATIONS WORKBENCH" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
if ($tunnelUrl) {
    Write-Host "   >>> YOUR LIVE CLOUDFLARE URL:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "       $tunnelUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "   * Real Python Backend: Connected & Active (Port 8000)" -ForegroundColor White
    Write-Host "   * React UI Frontend:   Connected & Active (Port 5173)" -ForegroundColor White
    Write-Host "   * Status:              ONLINE & SHARING LIVE" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Copy the URL above to open in your browser or share with team members." -ForegroundColor Gray
    Write-Host "   Press [Ctrl + C] anytime to stop sharing." -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "   [ERROR] Tunnel creation timed out. Please check your internet connection." -ForegroundColor Red
}

try {
    $proc.WaitForExit()
} finally {
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}

