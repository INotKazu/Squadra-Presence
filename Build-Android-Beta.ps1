param(
    [switch]$InitializeOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Require-Command {
    param([string]$Name, [string]$Help)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not installed. $Help"
    }
}

Require-Command "node" "Install the current Node.js LTS release first."
Require-Command "npm" "Install the current Node.js LTS release first."
Require-Command "cargo" "Install Rust with: winget install --id Rustlang.Rustup"
Require-Command "rustup" "Install Rust with: winget install --id Rustlang.Rustup"

if (-not $env:JAVA_HOME) {
    $androidStudioJava = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path $androidStudioJava) {
        $env:JAVA_HOME = $androidStudioJava
    }
}

if ($env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    $env:Path = "$(Join-Path $env:JAVA_HOME 'bin');$env:Path"
}
Require-Command "java" "Install Android Studio, then reopen PowerShell."

if (-not $env:ANDROID_HOME) {
    $defaultAndroidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultAndroidSdk) {
        $env:ANDROID_HOME = $defaultAndroidSdk
    }
}

if (-not $env:NDK_HOME -and $env:ANDROID_HOME) {
    $ndkRoot = Join-Path $env:ANDROID_HOME "ndk"
    if (Test-Path $ndkRoot) {
        $latestNdk = Get-ChildItem -Path $ndkRoot -Directory | Sort-Object Name | Select-Object -Last 1
        if ($latestNdk) {
            $env:NDK_HOME = $latestNdk.FullName
        }
    }
}

if (-not $env:JAVA_HOME -or -not (Test-Path $env:JAVA_HOME)) {
    throw "JAVA_HOME is missing. In Android Studio install its bundled JDK, then set JAVA_HOME to C:\Program Files\Android\Android Studio\jbr."
}
if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    throw "ANDROID_HOME is missing. Install Android Studio's SDK, then set ANDROID_HOME to $env:LOCALAPPDATA\Android\Sdk."
}
if (-not $env:NDK_HOME -or -not (Test-Path $env:NDK_HOME)) {
    throw "NDK_HOME is missing. In Android Studio SDK Manager install NDK (Side by side), then reopen PowerShell."
}

Write-Host "Squadra Companion Android beta" -ForegroundColor Cyan
Write-Host "Installing locked JavaScript dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }

Write-Host "Installing Android Rust targets..." -ForegroundColor Cyan
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
if ($LASTEXITCODE -ne 0) { throw "Rust Android target setup failed with exit code $LASTEXITCODE." }

$androidProject = Join-Path $PSScriptRoot "src-tauri\gen\android"
if (-not (Test-Path $androidProject)) {
    Write-Host "Generating the native Android Studio project..." -ForegroundColor Cyan
    npx --no-install tauri android init --ci
    if ($LASTEXITCODE -ne 0) { throw "Android project initialization failed with exit code $LASTEXITCODE." }
} else {
    Write-Host "Android project already initialized." -ForegroundColor DarkGray
}

if ($InitializeOnly) {
    Write-Host "`nAndroid project initialized successfully." -ForegroundColor Green
    exit 0
}

Write-Host "Running companion tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { throw "The test suite failed with exit code $LASTEXITCODE." }

Write-Host "Building the installable Android beta APK..." -ForegroundColor Cyan
npx --no-install tauri android build --debug --apk
if ($LASTEXITCODE -ne 0) { throw "The Android beta build failed with exit code $LASTEXITCODE." }

$apk = Get-ChildItem -Path $androidProject -Filter "*.apk" -File -Recurse |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $apk) {
    throw "The build completed, but no APK was found under src-tauri\gen\android."
}

Write-Host "`nSquadra Companion Android beta is ready:" -ForegroundColor Green
Write-Host $apk.FullName -ForegroundColor Green
Write-Host "Copy that APK to the Android phone and open it to install. Android may ask you to allow installs from that file app once." -ForegroundColor Yellow
