$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install the current Node.js LTS release first."
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw "Rust is not installed. Install the stable MSVC toolchain from https://rustup.rs first."
}

$keyPath = Join-Path $env:LOCALAPPDATA "KazuCorp\SquadraPresenceUpdater\squadra-presence.key"
$projectPublicKey = Join-Path $PSScriptRoot "src-tauri\updater_public_key.txt"
$publicKeyText = if (Test-Path $projectPublicKey) { (Get-Content -Raw $projectPublicKey).Trim() } else { "" }

if (-not (Test-Path $keyPath) -or $publicKeyText.StartsWith("UNCONFIGURED")) {
    throw "Run .\Setup-Updater.ps1 once before making an update-enabled release build."
}

$securePassword = Read-Host "Updater key password (press Enter if you created it without one)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:TAURI_SIGNING_PRIVATE_KEY = $keyPath
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $plainPassword

    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }
    Write-Host "Running tests..." -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) {
        throw "The test suite failed with exit code $LASTEXITCODE."
    }
    Write-Host "Building signed Windows installer and updater artifacts..." -ForegroundColor Cyan
    npm run tauri build
    if ($LASTEXITCODE -ne 0) {
        throw "The Tauri release build failed with exit code $LASTEXITCODE. No completed installer was produced."
    }
} finally {
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}

Write-Host "`nRelease build complete." -ForegroundColor Green
Write-Host "Run .\Prepare-GitHub-Release.ps1 to assemble the GitHub upload files." -ForegroundColor Cyan
