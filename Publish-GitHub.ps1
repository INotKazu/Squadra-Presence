param(
    [string]$Version = "",
    [string]$Repository = "INotKazu/Squadra-Presence"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Invoke-Checked {
    param([string]$Program)

    # Keep this as a simple PowerShell function so every unbound native
    # argument—including values such as -A and --repo—remains in $args.
    & $Program @args
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed with exit code $LASTEXITCODE."
    }
}

if (-not $Version) {
    $package = Get-Content -Raw (Join-Path $PSScriptRoot "package.json") | ConvertFrom-Json
    $Version = [string]$package.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Version must be a valid release version such as 0.6.1."
}

if ($Repository -ne "INotKazu/Squadra-Presence") {
    throw "This publisher is locked to INotKazu/Squadra-Presence so updater URLs cannot be redirected accidentally."
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is required. Install Git for Windows, then run this script again."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI is required. Run 'winget install --id GitHub.cli', reopen PowerShell, then run 'gh auth login'."
}

Write-Host "Checking the connected GitHub account..." -ForegroundColor Cyan
Invoke-Checked gh auth status
$loginOutput = & gh api user --jq ".login"
if ($LASTEXITCODE -ne 0 -or $null -eq $loginOutput) {
    throw "GitHub CLI could not read the signed-in account. Run 'gh auth login' and try again."
}
$login = ([string]$loginOutput).Trim()
if (-not $login) {
    throw "GitHub CLI returned an empty account name. Run 'gh auth login' and try again."
}
if ($login -ine "INotKazu") {
    throw "GitHub CLI is signed in as '$login'. Sign in as INotKazu before publishing this repository."
}

if (-not (Test-Path (Join-Path $PSScriptRoot ".git"))) {
    Invoke-Checked git init -b main
}

# Set repository-local authorship explicitly. This avoids Windows PowerShell
# returning $null when a new Git installation has no global identity yet.
Invoke-Checked git config user.name $login
Invoke-Checked git config user.email "$login@users.noreply.github.com"

Invoke-Checked git add -A
$stagedPaths = @(& git diff --cached --name-only)
$forbiddenPattern = '(^|/)(node_modules|dist|target|release-output)(/|$)|(^|/)\.env($|\.)|\.key(\.pub)?$|(^|/).*backup.*\.json$'
$forbiddenPaths = @($stagedPaths | Where-Object { $_ -match $forbiddenPattern })
if ($forbiddenPaths.Count -gt 0) {
    & git reset
    throw "Publishing stopped because private or generated files were staged: $($forbiddenPaths -join ', ')"
}

if ($stagedPaths.Count -gt 0) {
    Invoke-Checked git commit -m "Release Squadra Presence v$Version"
}

$repoExists = $false
$repoJson = [string](& gh repo view $Repository --json nameWithOwner,visibility 2>$null)
if ($LASTEXITCODE -eq 0) {
    $repoExists = $true
    $repoInfo = $repoJson | ConvertFrom-Json
    if ([string]$repoInfo.visibility -ne "PUBLIC") {
        throw "$Repository exists but is not public. The in-app updater needs public release downloads, so publication stopped without changing its visibility."
    }
}

if (-not $repoExists) {
    Write-Host "Creating the public GitHub repository $Repository..." -ForegroundColor Cyan
    Invoke-Checked gh repo create $Repository --public --source . --remote origin --description "Unofficial local-first Discord Rich Presence and companion for DRAGON BALL GEKISHIN SQUADRA."
}

$remoteOutput = & git remote get-url origin 2>$null
$remoteUrl = if ($null -eq $remoteOutput) { "" } else { ([string]$remoteOutput).Trim() }
if (-not $remoteUrl) {
    Invoke-Checked git remote add origin "https://github.com/$Repository.git"
} elseif ($remoteUrl -notmatch '(?i)(github\.com[:/]|git@github\.com:|git\.chatgpt-team\.site/)(INotKazu/Squadra-Presence)(\.git)?$') {
    throw "The existing origin remote points somewhere unexpected: $remoteUrl"
}

Invoke-Checked git branch -M main
Invoke-Checked git push -u origin main

$releaseFolder = Join-Path $PSScriptRoot "release-output\v$Version"
if (-not (Test-Path $releaseFolder)) {
    Write-Host "`nSource published successfully." -ForegroundColor Green
    Write-Host "No signed v$Version release folder exists yet." -ForegroundColor Yellow
    Write-Host "Run .\Build-Release.ps1, then .\Prepare-GitHub-Release.ps1, then run this publisher again." -ForegroundColor Cyan
    exit 0
}

$installer = Get-ChildItem -Path $releaseFolder -Filter "*${Version}*setup.exe" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $installer) {
    throw "No signed NSIS installer was found under $releaseFolder."
}

$signature = Get-Item "$($installer.FullName).sig" -ErrorAction SilentlyContinue
$manifest = Get-Item (Join-Path $releaseFolder "latest.json") -ErrorAction SilentlyContinue
if (-not $signature -or -not $manifest) {
    throw "The release must contain the installer, its .sig file, and latest.json. Run .\Prepare-GitHub-Release.ps1 again."
}

$manifestData = Get-Content -Raw $manifest.FullName | ConvertFrom-Json
if ([string]$manifestData.version -ne $Version) {
    throw "latest.json contains version '$($manifestData.version)' instead of '$Version'."
}

$tag = "v$Version"
$releaseNotes = @"
Squadra Presence v$Version

See CHANGELOG.md for the complete feature and fix list.

This is an unofficial KazuCorp fan project and is not affiliated with Bandai Namco Entertainment.
"@

& gh release view $tag --repo $Repository *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating the existing $tag release assets..." -ForegroundColor Cyan
    Invoke-Checked gh release upload $tag $installer.FullName $signature.FullName $manifest.FullName --repo $Repository --clobber
    Invoke-Checked gh release edit $tag --repo $Repository --title "Squadra Presence v$Version" --notes $releaseNotes --latest
} else {
    Write-Host "Creating GitHub release $tag..." -ForegroundColor Cyan
    Invoke-Checked gh release create $tag $installer.FullName $signature.FullName $manifest.FullName --repo $Repository --target main --title "Squadra Presence v$Version" --notes $releaseNotes --latest
}

Write-Host "`nGitHub publication complete:" -ForegroundColor Green
Write-Host "https://github.com/$Repository" -ForegroundColor Green
Write-Host "https://github.com/$Repository/releases/tag/$tag" -ForegroundColor Green
Write-Host "The private updater key and password were not uploaded." -ForegroundColor Yellow
