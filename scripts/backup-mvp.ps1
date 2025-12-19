# MVP Backup Script voor Bureau-AI Platform (PowerShell)
# Dit script maakt een complete backup van de MVP codebase

$ErrorActionPreference = "Stop"

$BackupDir = "backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "bureau-ai-mvp-backup-$Timestamp"
$BackupPath = Join-Path $BackupDir $BackupName

Write-Host "🚀 Starting MVP Backup..." -ForegroundColor Green
Write-Host "📦 Backup name: $BackupName" -ForegroundColor Cyan

# Maak backup directory aan
New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null

# 1. Backup source code (exclusief node_modules, .next, etc.)
Write-Host "📁 Copying source code..." -ForegroundColor Yellow
$excludeDirs = @('node_modules', '.next', 'out', '.git', 'backups', '*.db', '*.db-journal', '.env*', '*.log', 'tsconfig.tsbuildinfo')
Get-ChildItem -Path . -Exclude $excludeDirs | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination (Join-Path $BackupPath $_.Name) -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination (Join-Path $BackupPath $_.Name) -Force
    }
}

# 2. Backup Prisma schema en migraties
Write-Host "🗄️  Backing up Prisma schema and migrations..." -ForegroundColor Yellow
$prismaBackup = Join-Path $BackupPath "prisma-backup"
New-Item -ItemType Directory -Force -Path $prismaBackup | Out-Null
Copy-Item -Path "prisma\schema.prisma" -Destination $prismaBackup -Force -ErrorAction SilentlyContinue
if (Test-Path "prisma\migrations") {
    Copy-Item -Path "prisma\migrations" -Destination $prismaBackup -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "prisma\seed.ts") {
    Copy-Item -Path "prisma\seed.ts" -Destination $prismaBackup -Force -ErrorAction SilentlyContinue
}

# 3. Backup package files
Write-Host "📦 Backing up package files..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination $BackupPath -Force -ErrorAction SilentlyContinue
Copy-Item -Path "package-lock.json" -Destination $BackupPath -Force -ErrorAction SilentlyContinue

# 4. Backup config files
Write-Host "⚙️  Backing up configuration files..." -ForegroundColor Yellow
$configFiles = @("env.example", "next.config.js", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "render.yaml", "Dockerfile")
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $BackupPath -Force -ErrorAction SilentlyContinue
    }
}

# 5. Backup documentation
Write-Host "📚 Backing up documentation..." -ForegroundColor Yellow
$docsBackup = Join-Path $BackupPath "docs-backup"
New-Item -ItemType Directory -Force -Path $docsBackup | Out-Null
if (Test-Path "docs") {
    Copy-Item -Path "docs" -Destination $docsBackup -Recurse -Force -ErrorAction SilentlyContinue
}
$docFiles = @("README.md", "DEPLOYMENT.md", "N8N_DEPLOYMENT.md")
foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $BackupPath -Force -ErrorAction SilentlyContinue
    }
}

# 6. Create backup manifest
Write-Host "📋 Creating backup manifest..." -ForegroundColor Yellow
$gitBranch = try { git branch --show-current 2>$null } catch { "unknown" }
$gitCommit = try { git rev-parse HEAD 2>$null } catch { "unknown" }
$gitStatus = try { git status --short 2>$null | Select-Object -First 5 | Out-String } catch { "unknown" }

$manifest = @"
Bureau-AI MVP Backup
====================
Date: $(Get-Date)
Backup Name: $BackupName
Git Branch: $gitBranch
Git Commit: $gitCommit
Git Status: $gitStatus

Contents:
--------
- Source code (app/, components/, lib/, etc.)
- Prisma schema and migrations
- Configuration files
- Documentation
- Package dependencies

Restore Instructions:
--------------------
1. Extract backup to a new directory
2. Run: npm install
3. Copy env.example to .env and fill in values
4. Run: npx prisma migrate deploy
5. Run: npm run build
6. Run: npm start

Database Backup:
---------------
This backup does NOT include database data.
To backup database, run separately:
  pg_dump <DATABASE_URL> > database_backup.sql

Environment Variables:
---------------------
See env.example for required variables.
Store actual values securely (not in backup).
"@

$manifest | Out-File -FilePath (Join-Path $BackupPath "BACKUP_MANIFEST.txt") -Encoding UTF8

# 7. Create compressed archive
Write-Host "🗜️  Creating compressed archive..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Compress-Archive -Path $BackupPath -DestinationPath (Join-Path $BackupDir "$BackupName.zip") -Force

# 8. Calculate backup size
$backupSize = (Get-ChildItem -Path $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$archiveSize = (Get-Item (Join-Path $BackupDir "$BackupName.zip")).Length / 1MB

Write-Host ""
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "📊 Backup size: $([math]::Round($backupSize, 2)) MB" -ForegroundColor Cyan
Write-Host "📦 Archive size: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor Cyan
Write-Host "📍 Location: $BackupPath" -ForegroundColor Cyan
Write-Host "🗜️  Archive: $BackupDir\$BackupName.zip" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review backup contents in: $BackupPath"
Write-Host "   2. Test restore process if needed"
Write-Host "   3. Store archive securely (cloud storage, external drive)"
Write-Host "   4. Create database backup separately (see BACKUP_MANIFEST.txt)"

