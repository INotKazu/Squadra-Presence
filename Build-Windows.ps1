$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install the current Node.js LTS release, then run this script again."
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw "Rust is not installed. Install the stable MSVC toolchain from https://rustup.rs, then run this script again."
}

$tauriConfig = Get-Content -Raw (Join-Path $PSScriptRoot "src-tauri\tauri.conf.json") | ConvertFrom-Json
if ($tauriConfig.bundle.createUpdaterArtifacts -eq $true) {
    Write-Host "Updater signing is configured; switching to the signed release workflow." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "Build-Release.ps1")
    if (-not $?) {
        throw "The signed release workflow failed."
    }
    exit 0
}

Write-Host "Installing JavaScript dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    throw "npm install failed with exit code $LASTEXITCODE."
}

Write-Host "Running tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
    throw "The test suite failed with exit code $LASTEXITCODE."
}

Write-Host "Building the Windows installer..." -ForegroundColor Cyan
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    throw "The Tauri Windows build failed with exit code $LASTEXITCODE. No completed installer was produced."
}

Write-Host "`nBuild complete." -ForegroundColor Green
Write-Host "Installers are in: $PSScriptRoot\src-tauri\target\release\bundle"
