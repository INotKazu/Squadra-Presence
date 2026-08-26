param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $Version) {
    $package = Get-Content -Raw (Join-Path $PSScriptRoot "package.json") | ConvertFrom-Json
    $Version = [string]$package.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Version must be a valid release version such as 0.6.1."
}

$nsisFolder = Join-Path $PSScriptRoot "src-tauri\target\release\bundle\nsis"
$installer = Get-ChildItem -Path $nsisFolder -Filter "*${Version}*setup.exe" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "No NSIS installer for version $Version was found. Run .\Build-Release.ps1 first."
}

$signaturePath = "$($installer.FullName).sig"
if (-not (Test-Path $signaturePath)) {
    throw "The updater signature is missing: $signaturePath"
}

$releaseFolder = Join-Path $PSScriptRoot "release-output\v$Version"
New-Item -ItemType Directory -Path $releaseFolder -Force | Out-Null
Copy-Item $installer.FullName (Join-Path $releaseFolder $installer.Name) -Force
Copy-Item $signaturePath (Join-Path $releaseFolder "$($installer.Name).sig") -Force

$signature = (Get-Content -Raw $signaturePath).Trim()
$downloadUrl = "https://github.com/INotKazu/Squadra-Presence/releases/download/v$Version/$($installer.Name)"
$manifest = [ordered]@{
    version = $Version
    notes = "See the GitHub release notes for Squadra Presence v$Version."
    pub_date = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    platforms = [ordered]@{
        "windows-x86_64" = [ordered]@{
            signature = $signature
            url = $downloadUrl
        }
    }
}
$manifestPath = Join-Path $releaseFolder "latest.json"
$manifestJson = $manifest | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($manifestPath, "$manifestJson`n", (New-Object System.Text.UTF8Encoding($false)))

Write-Host "`nGitHub release files are ready:" -ForegroundColor Green
Write-Host $releaseFolder
Write-Host "Create release tag v$Version in INotKazu/Squadra-Presence and upload all three files." -ForegroundColor Cyan
Write-Host "The installed app will then discover this release through latest.json." -ForegroundColor Cyan

