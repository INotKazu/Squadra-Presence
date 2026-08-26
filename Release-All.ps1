param(
    [string]$Version = "",
    [string]$Repository = "INotKazu/Squadra-Presence"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$package = Get-Content -Raw (Join-Path $PSScriptRoot "package.json") | ConvertFrom-Json
$packageVersion = [string]$package.version
if (-not $Version) {
    $Version = $packageVersion
}

if ($Version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Version must be a valid release version such as 0.6.2."
}
if ($Version -ne $packageVersion) {
    throw "Requested version '$Version' does not match package.json version '$packageVersion'. Update the project version before publishing."
}
if ($Repository -ne "INotKazu/Squadra-Presence") {
    throw "This release workflow is locked to INotKazu/Squadra-Presence."
}

$buildScript = Join-Path $PSScriptRoot "Build-Release.ps1"
$prepareScript = Join-Path $PSScriptRoot "Prepare-GitHub-Release.ps1"
$publishScript = Join-Path $PSScriptRoot "Publish-GitHub.ps1"
foreach ($script in @($buildScript, $prepareScript, $publishScript)) {
    if (-not (Test-Path $script)) {
        throw "Required release script is missing: $script"
    }
}

Write-Host "Squadra Presence v$Version release workflow" -ForegroundColor Cyan
Write-Host "1/3 Building, testing, and signing the Windows update..." -ForegroundColor Cyan
& $buildScript

Write-Host "`n2/3 Preparing the installer, signature, and latest.json..." -ForegroundColor Cyan
& $prepareScript -Version $Version

Write-Host "`n3/3 Publishing the source and signed release to GitHub..." -ForegroundColor Cyan
& $publishScript -Version $Version -Repository $Repository

Write-Host "`nSquadra Presence v$Version is published and ready for in-app updates." -ForegroundColor Green
Write-Host "https://github.com/$Repository/releases/tag/v$Version" -ForegroundColor Green
Write-Host "The updater private key and password remained on this PC." -ForegroundColor Yellow
