# Automated first-time setup for the dictation server (Windows PowerShell).
#
# Usage:
#   cd dictation-server
#   ./setup.ps1
#
# What it does:
#   1. Checks Python 3.10+ is available
#   2. Creates venv/ if missing
#   3. Activates the venv
#   4. Installs dependencies from requirements.txt
#   5. Copies .env.example to .env if .env doesn't exist
#   6. Prints the command to start the server

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

Write-Host "==> Checking Python..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "    $pythonVersion"
    $versionMatch = $pythonVersion -match 'Python (\d+)\.(\d+)'
    if ($versionMatch) {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
            Write-Host "ERROR: Python 3.10 or newer is required. Found $pythonVersion" -ForegroundColor Red
            Write-Host "Install from https://python.org (check 'Add to PATH' during install)."
            exit 1
        }
    }
} catch {
    Write-Host "ERROR: 'python' command not found." -ForegroundColor Red
    Write-Host "Install Python 3.10+ from https://python.org (check 'Add to PATH' during install)."
    exit 1
}

Write-Host "==> Creating virtual environment in ./venv..." -ForegroundColor Cyan
if (Test-Path "venv") {
    Write-Host "    venv/ already exists, reusing it."
} else {
    python -m venv venv
    Write-Host "    Created."
}

Write-Host "==> Activating venv..." -ForegroundColor Cyan
$activate = Join-Path $scriptDir "venv\Scripts\Activate.ps1"
if (-not (Test-Path $activate)) {
    Write-Host "ERROR: venv activation script not found at $activate" -ForegroundColor Red
    exit 1
}
. $activate

Write-Host "==> Installing dependencies (this takes ~2 minutes the first time)..." -ForegroundColor Cyan
pip install --quiet --disable-pip-version-check -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pip install failed." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "    Done."

Write-Host "==> Checking .env..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "    Created .env from .env.example."
} else {
    Write-Host "    .env already exists, not overwriting."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server now, run:" -ForegroundColor Yellow
Write-Host "    uvicorn main:app --reload --port 8000"
Write-Host ""
Write-Host "Next time, activate the venv first:" -ForegroundColor Yellow
Write-Host "    venv\Scripts\Activate.ps1"
Write-Host "    uvicorn main:app --reload --port 8000"
Write-Host ""
Write-Host "First request will be slow (30-60s) while Whisper downloads the model."
