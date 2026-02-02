# fix-all.ps1 - Correction des deux problèmes
Write-Host "=== CORRECTION DES 2 PROBLÈMES ===" -ForegroundColor Green

# 1. Installer next-themes si nécessaire
Write-Host "1. Vérification de next-themes..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if (-not ($packageJson.dependencies."next-themes" -or $packageJson.devDependencies."next-themes")) {
    Write-Host "   Installation de next-themes..." -ForegroundColor Cyan
    pnpm add next-themes
} else {
    Write-Host "   ✅ next-themes déjà installé" -ForegroundColor Green
}

# 2. Mettre à jour main.jsx avec ThemeProvider
Write-Host "2. Mise à jour de main.jsx..." -ForegroundColor Yellow
$mainJsxPath = "src/main.jsx"
if (Test-Path $mainJsxPath) {
    $content = Get-Content $mainJsxPath -Raw
    
    # Vérifier si ThemeProvider est déjà présent
    if ($content -notmatch "ThemeProvider") {
        $newContent = $content -replace 
            'import { Toaster as Sonner } from "@/components/ui/sonner";',
            'import { Toaster as Sonner } from "@/components/ui/sonner";' + "`n" + 'import { ThemeProvider } from "next-themes";'
        
        $newContent = $newContent -replace 
            '<TooltipProvider>',
            '<ThemeProvider attribute="class" defaultTheme="light" enableSystem>' + "`n" + '  <TooltipProvider>'
        
        $newContent = $newContent -replace 
            '</TooltipProvider>',
            '  </TooltipProvider>' + "`n" + '</ThemeProvider>'
        
        $newContent | Set-Content $mainJsxPath -Encoding UTF8
        Write-Host "   ✅ main.jsx mis à jour avec ThemeProvider" -ForegroundColor Green
    } else {
        Write-Host "   ✅ ThemeProvider déjà présent" -ForegroundColor Green
    }
}

# 3. Vérifier les routes problématiques
Write-Host "3. Recherche de routes problématiques..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter *.jsx,*.tsx | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    
    # Chercher des routes avec paramètres mal formés
    if ($content -match 'path="[^"]*:[^a-zA-Z_$]' -or $content -match "path='[^']*:[^a-zA-Z_$]") {
        Write-Host "   ⚠️  Route suspecte dans: $file" -ForegroundColor Yellow
        Write-Host "      Extraît: $($matches[0])" -ForegroundColor Gray
    }
    
    # Chercher les routes avec ":patientId" (bon format)
    if ($content -match 'path="[^"]*:patientId[^"]*"') {
        Write-Host "   ✅ Route /patient/:patientId trouvée dans: $file" -ForegroundColor Green
    }
}

# 4. Nettoyer le cache
Write-Host "4. Nettoyage du cache..." -ForegroundColor Yellow
Remove-Item -Path "node_modules/.vite", "node_modules/.vite-temp" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n=== RÉSUMÉ ===" -ForegroundColor Green
Write-Host "Problème 1: path-to-regexp" -ForegroundColor Cyan
Write-Host "   → Vérifiez vos routes React Router (surtout /patient/:patientId)" -ForegroundColor White
Write-Host "   → Le paramètre doit avoir un nom valide (:patientId, pas : ou :patient-id)" -ForegroundColor White
Write-Host ""
Write-Host "Problème 2: Sonner + useTheme" -ForegroundColor Cyan
Write-Host "   → ThemeProvider ajouté dans main.jsx" -ForegroundColor White
Write-Host "   → Alternative: <Sonner theme='light' /> si pas de gestion de thème" -ForegroundColor White
Write-Host ""
Write-Host "=== INSTRUCTIONS ===" -ForegroundColor Yellow
Write-Host "1. Vérifiez MANUELLEMENT vos routes dans App.jsx et autres composants" -ForegroundColor White
Write-Host "2. Démarrez Vite: pnpm dev" -ForegroundColor White
Write-Host "3. Si erreur persiste, partagez TOUTES vos routes" -ForegroundColor White