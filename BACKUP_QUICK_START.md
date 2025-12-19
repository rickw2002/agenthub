# 🚀 MVP Backup - Quick Start

## Snelle Backup (Windows PowerShell)

```powershell
# Optie 1: Via npm script
npm run backup:mvp

# Optie 2: Direct script
.\scripts\backup-mvp.ps1
```

## Snelle Backup (Linux/Mac)

```bash
# Maak script executable
chmod +x scripts/backup-mvp.sh

# Run backup
./scripts/backup-mvp.sh
```

## Wat wordt gebackupt?

✅ **Source code** (app/, components/, lib/, etc.)  
✅ **Prisma schema & migrations**  
✅ **Configuratie bestanden** (package.json, tsconfig.json, etc.)  
✅ **Documentatie**  
✅ **Compressed archive** (.zip of .tar.gz)

❌ **NIET gebackupt:**
- `node_modules/` (herinstalleer met `npm install`)
- `.env` files (veilig opslaan apart)
- Database data (apart backuppen)
- `.next/` build files

## Database Backup (Apart)

```bash
# Via Supabase Dashboard (aanbevolen)
# Ga naar: Project Settings → Database → Backup

# Of via command line:
pg_dump $DATABASE_URL > database_backup_$(date +%Y%m%d).sql
```

## Git Tag (Aanbevolen)

```bash
# Maak een tag voor deze MVP versie
git tag -a mvp-v1.0 -m "MVP 1.0 - Production Ready"

# Push tag naar remote
git push origin mvp-v1.0
```

## Backup Locatie

Backups worden opgeslagen in: `backups/bureau-ai-mvp-backup-YYYYMMDD_HHMMSS/`

## Restore

Zie `docs/MVP_BACKUP.md` voor complete restore instructies.

---

**💡 Tip:** Run backup regelmatig (maandelijks of bij belangrijke releases)

