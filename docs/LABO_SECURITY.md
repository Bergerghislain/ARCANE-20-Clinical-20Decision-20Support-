# Securite labo / serveur ARCANE (P2)

Ce guide complete `.env.example`. La CI GitHub **ne remplace pas** une configuration correcte sur ta machine ou le serveur de labo.

## 1. Creer le fichier `.env`

```powershell
cd C:\Users\Ghislain\Documents\ARCANE-20-Clinical-20Decision-20Support-
copy .env.example .env
```

Ne jamais committer `.env` (deja dans `.gitignore`).

## 2. JWT_SECRET (obligatoire)

Genere une valeur aleatoire longue :

```powershell
# OpenSSL (Git Bash ou WSL)
openssl rand -hex 32

# PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Dans `.env` :

```env
JWT_SECRET=<collez_la_valeur_generee>
```

**Pourquoi :** les tokens de session sont signes avec ce secret. S'il est faible ou public, un attaquant peut forger des sessions admin.

## 3. ALLOW_DEMO_PASSWORD_FALLBACK (labo = false)

```env
ALLOW_DEMO_PASSWORD_FALLBACK=false
```

**Pourquoi :** ce fallback (héritage des anciens hashes factices) acceptait le mot
de passe `password` sur des hashes placeholder. Les seeds créent désormais de **vrais
hashes bcrypt** (`scripts/seed_demo.py`), donc on ne dépend plus de ce fallback :
il reste **`false` partout**, y compris en **CI**.

Le fallback restant dans `security.py` ne s'applique qu'à des hashes placeholder/vides
(jamais à un vrai hash `$2...`) et peut être supprimé entièrement par la suite.

## 4. Cookies (refresh token)

| Variable | Dev local HTTP | Labo HTTPS |
|----------|----------------|------------|
| `COOKIE_SECURE` | `false` | `true` |
| `COOKIE_SAMESITE` | `lax` | `lax` (ou `strict` si meme site) |
| `COOKIE_DOMAIN` | vide | vide ou `.votredomaine.lab` |

**Pourquoi `COOKIE_SECURE=true` en HTTPS :** le navigateur n'envoie le cookie de refresh qu'en connexion chiffree.

## 5. CORS_ORIGINS

Liste **exacte** des URLs utilisees par les navigateurs du labo, separees par des virgules :

```env
# Exemple : API + SPA sur la meme machine, port 8000
CORS_ORIGINS=http://192.168.1.50:8000,http://127.0.0.1:8000

# Si frontend Vite separe (dev) sur 8080
# CORS_ORIGINS=http://192.168.1.50:8080,http://localhost:8080
```

**Pourquoi :** FastAPI (`main.py`) n'accepte que ces origines pour les requetes cross-origin avec credentials.

## 6. Verifier automatiquement

```powershell
python scripts/validate-lab-env.py
python scripts/validate-lab-env.py --strict-https
```

Corriger les lignes `[ERR]` avant deploiement.

## 7. PostgreSQL de test (tests backend locaux)

Distinct de la config labo utilisateurs :

```powershell
# Base dediee aux tests (pas la prod labo)
createdb arcane_test
$env:DB_NAME="arcane_test"
powershell -File scripts/ci-init-db.ps1
python -m pytest backend_fastapi/tests -q --benchmark-disable
```

La CI fait la meme chose automatiquement avec un Postgres ephemere.
