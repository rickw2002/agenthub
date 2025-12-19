#!/bin/bash

# MVP Backup Script voor Bureau-AI Platform
# Dit script maakt een complete backup van de MVP codebase

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="bureau-ai-mvp-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "🚀 Starting MVP Backup..."
echo "📦 Backup name: ${BACKUP_NAME}"

# Maak backup directory aan
mkdir -p "${BACKUP_PATH}"

# 1. Backup codebase (exclusief node_modules, .next, etc.)
echo "📁 Copying source code..."
rsync -av --exclude='node_modules' \
          --exclude='.next' \
          --exclude='out' \
          --exclude='.git' \
          --exclude='*.db' \
          --exclude='*.db-journal' \
          --exclude='.env*' \
          --exclude='*.log' \
          --exclude='tsconfig.tsbuildinfo' \
          --exclude='backups' \
          . "${BACKUP_PATH}/"

# 2. Backup Prisma schema en migraties
echo "🗄️  Backing up Prisma schema and migrations..."
mkdir -p "${BACKUP_PATH}/prisma-backup"
cp -r prisma/schema.prisma "${BACKUP_PATH}/prisma-backup/"
cp -r prisma/migrations "${BACKUP_PATH}/prisma-backup/" 2>/dev/null || true
cp -r prisma/seed.ts "${BACKUP_PATH}/prisma-backup/" 2>/dev/null || true

# 3. Backup package files
echo "📦 Backing up package files..."
cp package.json "${BACKUP_PATH}/"
cp package-lock.json "${BACKUP_PATH}/" 2>/dev/null || true

# 4. Backup config files
echo "⚙️  Backing up configuration files..."
cp -r env.example "${BACKUP_PATH}/" 2>/dev/null || true
cp next.config.js "${BACKUP_PATH}/" 2>/dev/null || true
cp tsconfig.json "${BACKUP_PATH}/" 2>/dev/null || true
cp tailwind.config.ts "${BACKUP_PATH}/" 2>/dev/null || true
cp postcss.config.mjs "${BACKUP_PATH}/" 2>/dev/null || true
cp render.yaml "${BACKUP_PATH}/" 2>/dev/null || true
cp Dockerfile "${BACKUP_PATH}/" 2>/dev/null || true

# 5. Backup documentation
echo "📚 Backing up documentation..."
mkdir -p "${BACKUP_PATH}/docs-backup"
cp -r docs "${BACKUP_PATH}/docs-backup/" 2>/dev/null || true
cp README.md "${BACKUP_PATH}/" 2>/dev/null || true
cp DEPLOYMENT.md "${BACKUP_PATH}/" 2>/dev/null || true
cp N8N_DEPLOYMENT.md "${BACKUP_PATH}/" 2>/dev/null || true

# 6. Create backup manifest
echo "📋 Creating backup manifest..."
cat > "${BACKUP_PATH}/BACKUP_MANIFEST.txt" << EOF
Bureau-AI MVP Backup
====================
Date: $(date)
Backup Name: ${BACKUP_NAME}
Git Branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git Status: $(git status --short 2>/dev/null | head -5 || echo "unknown")

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
EOF

# 7. Create compressed archive
echo "🗜️  Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
cd ..

# 8. Calculate backup size
BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
ARCHIVE_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "✅ Backup completed successfully!"
echo "📊 Backup size: ${BACKUP_SIZE}"
echo "📦 Archive size: ${ARCHIVE_SIZE}"
echo "📍 Location: ${BACKUP_PATH}"
echo "🗜️  Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
echo "💡 Next steps:"
echo "   1. Review backup contents in: ${BACKUP_PATH}"
echo "   2. Test restore process if needed"
echo "   3. Store archive securely (cloud storage, external drive)"
echo "   4. Create database backup separately (see BACKUP_MANIFEST.txt)"

