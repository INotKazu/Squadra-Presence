$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install the current Node.js LTS release first."
}

$keyDirectory = Join-Path $env:LOCALAPPDATA "KazuCorp\SquadraPresenceUpdater"
$privateKey = Join-Path $keyDirectory "squadra-presence.key"
$publicKey = "$privateKey.pub"
$projectPublicKey = Join-Path $PSScriptRoot "src-tauri\updater_public_key.txt"
$tauriConfig = Join-Path $PSScriptRoot "src-tauri\tauri.conf.json"

New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null

if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules\.bin\tauri.cmd"))) {
    Write-Host "Installing dependencies needed by the Tauri signer..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }
}

if (-not (Test-Path $privateKey) -or -not (Test-Path $publicKey)) {
    Write-Host "Creating the permanent Squadra Presence updater signing key..." -ForegroundColor Cyan
    Write-Host "Choose a password you can safely keep. Losing this key prevents future in-app updates." -ForegroundColor Yellow
    npm run tauri signer generate -- -w $privateKey
    if ($LASTEXITCODE -ne 0) {
        throw "The Tauri signing-key command failed with exit code $LASTEXITCODE. Run this setup again and enter the same password twice."
    }
}

if (-not (Test-Path $publicKey)) {
    throw "The Tauri signer did not create the expected public key at $publicKey"
}

$publicKeyText = (Get-Content -Raw $publicKey).Trim()
[System.IO.File]::WriteAllText($projectPublicKey, "$publicKeyText`n", (New-Object System.Text.UTF8Encoding($false)))

$config = Get-Content -Raw $tauriConfig | ConvertFrom-Json
$config.bundle.createUpdaterArtifacts = $true
if (-not $config.plugins) {
    $config | Add-Member -MemberType NoteProperty -Name plugins -Value ([pscustomobject]@{})
}
if (-not $config.plugins.updater) {
    $config.plugins | Add-Member -MemberType NoteProperty -Name updater -Value ([pscustomobject]@{})
}
$config.plugins.updater | Add-Member -MemberType NoteProperty -Name pubkey -Value $publicKeyText -Force
$config.plugins.updater | Add-Member -MemberType NoteProperty -Name endpoints -Value @(
    "https://github.com/INotKazu/Squadra-Presence/releases/latest/download/latest.json"
) -Force
$configJson = $config | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($tauriConfig, "$configJson`n", (New-Object System.Text.UTF8Encoding($false)))

Write-Host "`nUpdater configured for https://github.com/INotKazu/Squadra-Presence" -ForegroundColor Green
Write-Host "Private key: $privateKey" -ForegroundColor Green
Write-Host "Back up that private key somewhere secure. Never upload or share it." -ForegroundColor Yellow
Write-Host "Use .\Build-Release.ps1 for update-enabled release builds." -ForegroundColor Cyan
