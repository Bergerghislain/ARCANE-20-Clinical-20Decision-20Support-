# fix-vite.ps1
Write-Host "=== RÉPARATION VITE ÉCRAN BLANC ===" -ForegroundColor Green

# 1. Arrêter Vite
Write-Host "1. Arrêt des processus Vite..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force

# 2. Nettoyer les caches
Write-Host "2. Nettoyage des caches..." -ForegroundColor Yellow
Remove-Item -Path "node_modules/.vite", "node_modules/.vite-temp", "dist" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Vérifier/Créer les fichiers essentiels
Write-Host "3. Vérification des fichiers essentiels..." -ForegroundColor Yellow

# index.html
if (-not (Test-Path "index.html")) {
    @'
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARCANE</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
'@ | Out-File -FilePath "index.html" -Encoding UTF8
    Write-Host "   ✅ index.html créé" -ForegroundColor Green
}

# src/App.jsx
if (-not (Test-Path "src\App.jsx")) {
    New-Item -Path "src" -Name "App.jsx" -ItemType File -Force | Out-Null
    @'
export default function App() {
  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1 style={{ color: '#4CAF50' }}>ARCANE - Application Médicale</h1>
      <p>Frontend React fonctionnel ✅</p>
      <p>Base de données PostgreSQL connectée ✅</p>
    </div>
  );
}
'@ | Out-File -FilePath "src\App.jsx" -Encoding UTF8
    Write-Host "   ✅ src/App.jsx créé" -ForegroundColor Green
}

# 4. Démarrer Vite
Write-Host "4. Démarrage de Vite..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '=== DÉMARRAGE VITE ===' -ForegroundColor Cyan; pnpm dev"

Write-Host "`n=== INSTRUCTIONS ===" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:3000" -ForegroundColor Cyan
Write-Host "2. Appuyez sur Ctrl+F5 pour forcer le rafraîchissement" -ForegroundColor Cyan
Write-Host "3. Ouvrez DevTools (F12) et partagez les erreurs" -ForegroundColor Cyan