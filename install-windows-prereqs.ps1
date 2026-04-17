#Requires -Version 5.1
<#
  Installe les prerequis Windows pour ARCANE : Node.js LTS (npm + corepack) et Python 3.12.
  Executez dans PowerShell :  .\install-windows-prereqs.ps1
  winget peut demander une elevation (UAC) : acceptez la fenetre.
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

Write-Host ""
Write-Host "=== ARCANE - prerequis Windows ===" -ForegroundColor Cyan
Write-Host ('Repertoire projet : ' + $Root)
Write-Host ""

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget est introuvable. Installez App Installer (Microsoft Store), puis relancez ce script." -ForegroundColor Red
    exit 1
}

$needNode = -not (Get-Command node -ErrorAction SilentlyContinue)
$needNpm = -not (Get-Command npm -ErrorAction SilentlyContinue)

function Test-UsablePython {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $cmd) { return $false }
    if ($cmd.Source -match 'WindowsApps') { return $false }
    $prev = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        $ver = (& python --version 2>&1 | Out-String).Trim()
        return $ver -match '^Python\s+\d'
    }
    catch {
        return $false
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

$needPython = -not (Test-UsablePython)

if ($needNode -or $needNpm) {
    Write-Host "Installation de Node.js LTS (npm + corepack)..." -ForegroundColor Yellow
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    Refresh-Path
}

if ($needPython) {
    Write-Host "Installation de Python 3.12..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    Refresh-Path
}

Refresh-Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host 'Node.js n''est toujours pas dans le PATH. Fermez ce terminal, rouvrez PowerShell, puis relancez ce script.' -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host 'npm introuvable apres installation Node. Redemarrez le terminal.' -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Versions :" -ForegroundColor Green
& node --version
& npm --version

if (-not (Test-UsablePython)) {
    Write-Host ""
    Write-Host 'Python utilisable introuvable (alias Microsoft Store exclu).' -ForegroundColor Yellow
    Write-Host '  Parametres - Applications - Alias d''execution : desactivez python.exe et python3.exe.' -ForegroundColor White
    Write-Host "Puis fermez et rouvrez le terminal, ou relancez ce script apres installation Python." -ForegroundColor White
    exit 1
}

$pyVersion = (& python --version 2>&1 | Out-String).Trim()
Write-Host $pyVersion

Write-Host ""
Write-Host "Installation de pnpm..." -ForegroundColor Yellow
$ErrorActionPreference = 'Continue'
& corepack enable 2>$null
& corepack prepare pnpm@10.14.0 --activate 2>$null
$ErrorActionPreference = 'Stop'
Refresh-Path
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "corepack indisponible ou sans droits : installation globale via npm..." -ForegroundColor Yellow
    & npm install -g pnpm@10.14.0
    Refresh-Path
}
$useNpxPnpm = $false
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm toujours absent (droits administrateur souvent requis pour npm -g)." -ForegroundColor Yellow
    Write-Host "Installation des paquets npm via npx (sans pnpm global)..." -ForegroundColor Yellow
    $useNpxPnpm = $true
}

Write-Host ""
Write-Host "Dependances du depot..." -ForegroundColor Yellow
if ($useNpxPnpm) {
    & npx --yes pnpm@10.14.0 install
}
else {
    & pnpm install
}
& python -m pip install -r (Join-Path $Root "backend_fastapi\requirements.txt")

Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Green
Write-Host 'API  : pnpm run dev:api' -ForegroundColor White
Write-Host '       ou: python -m uvicorn backend_fastapi.app.main:app --reload --port 8000' -ForegroundColor White
Write-Host 'Front: pnpm run dev' -ForegroundColor White
if ($useNpxPnpm) {
    Write-Host ''
    Write-Host 'pnpm n''est pas dans le PATH : utilisez par exemple' -ForegroundColor Yellow
    Write-Host '  npx --yes pnpm@10.14.0 run dev' -ForegroundColor White
    Write-Host '  npx --yes pnpm@10.14.0 run dev:api' -ForegroundColor White
    Write-Host 'ou installez pnpm en admin : npm install -g pnpm@10.14.0' -ForegroundColor White
}
Write-Host 'Si les commandes manquent, fermez toutes les fenetres PowerShell puis rouvrez-en une.' -ForegroundColor Gray
Write-Host ""
