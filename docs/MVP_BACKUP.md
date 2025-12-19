# Bureau-AI MVP Backup Documentatie

**Datum:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Versie:** MVP 1.0  
**Status:** ✅ Production Ready

---

## 📋 Overzicht

Dit document beschrijft de complete backup procedure voor de Bureau-AI MVP. De MVP bevat:

### Core Functionaliteiten
- ✅ Bureau-AI personalisatie systeem (VoiceCard, AudienceCard, OfferCard, Constraints)
- ✅ LinkedIn & Blog content generatie met interview functionaliteit
- ✅ Brainstorm tool voor content ideeën
- ✅ Content Bank voor opslag en beheer van gegenereerde posts
- ✅ Thought to Post workflow met automatische verdiepingsvragen
- ✅ Output feedback systeem
- ✅ Minimalistisch design systeem (white/gray)

### Technische Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Supabase) met Prisma ORM
- **Auth:** NextAuth.js
- **AI:** OpenAI API (GPT-4)
- **Storage:** Supabase Storage
- **Deployment:** Render.com

---

## 🗂️ Backup Inhoud

### 1. Source Code
```
app/                    # Next.js app directory
├── (app)/              # Authenticated routes
│   ├── bureau-ai/      # Main Bureau-AI tools
│   ├── account/        # Account & personalization
│   ├── dashboard/      # Dashboard
│   └── ...
├── api/                # API routes
│   ├── generate/       # Content generation endpoints
│   ├── profile/        # Profile management
│   ├── outputs/        # Output management
│   └── thought/        # Interview questions
└── ...

components/             # React components
├── bureauai/           # Bureau-AI specific components
├── ui/                 # Design system components
└── ...

lib/                    # Utility libraries
├── bureauai/           # Bureau-AI core logic
│   ├── repo.ts         # Database operations
│   ├── prompts/        # LLM prompts
│   ├── quality/        # Quality evaluation
│   └── ...
└── ...
```

### 2. Database Schema
- **Prisma Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/` (alle migraties)
- **Seed Data:** `prisma/seed.ts`

### 3. Configuratie Bestanden
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `tailwind.config.ts` - Tailwind CSS config
- `next.config.js` - Next.js config
- `render.yaml` - Render deployment config
- `Dockerfile` - Docker config (voor n8n)
- `env.example` - Environment variables template

### 4. Documentatie
- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment instructions
- `N8N_DEPLOYMENT.md` - n8n setup
- `docs/bureau-ai/` - Bureau-AI specifications
- `docs/` - Additional documentation

---

## 🔧 Backup Procedures

### Optie 1: Automatisch Script (Aanbevolen)

#### Windows (PowerShell):
```powershell
.\scripts\backup-mvp.ps1
```

#### Linux/Mac (Bash):
```bash
chmod +x scripts/backup-mvp.sh
./scripts/backup-mvp.sh
```

### Optie 2: Handmatig

1. **Codebase Backup:**
   ```bash
   # Maak backup directory
   mkdir -p backups/mvp-manual-$(date +%Y%m%d)
   
   # Copy source (exclusief node_modules, .next, etc.)
   rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' \
     --exclude='*.db' --exclude='.env*' . backups/mvp-manual-$(date +%Y%m%d)/
   ```

2. **Git Tag (aanbevolen):**
   ```bash
   git tag -a mvp-v1.0 -m "MVP 1.0 - Production Ready"
   git push origin mvp-v1.0
   ```

3. **Database Backup:**
   ```bash
   # Via Supabase Dashboard of pg_dump
   pg_dump $DATABASE_URL > backups/database_backup_$(date +%Y%m%d).sql
   ```

---

## 🗄️ Database Backup

### Via Supabase Dashboard
1. Ga naar Supabase Dashboard → Project Settings → Database
2. Klik op "Backup" of gebruik "Point-in-time Recovery"
3. Download backup

### Via Command Line
```bash
# Met pg_dump
pg_dump $DATABASE_URL > database_backup.sql

# Of met connection string
pg_dump "postgresql://user:pass@host:5432/dbname" > database_backup.sql
```

### Belangrijke Tabellen
- `User` - Gebruikers accounts
- `Workspace` - Workspaces
- `ProfileCard` - Bureau-AI profielen
- `ProfileAnswer` - Personalisatie antwoorden
- `Output` - Gegenereerde content
- `Feedback` - Gebruikers feedback

---

## 🔐 Environment Variables Backup

**⚠️ BELANGRIJK:** Environment variables bevatten secrets. Sla deze **NIET** in de codebase backup op.

### Lijst van Required Variables:
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Agent Service
AGENT_SERVICE_KEY=
```

### Backup Procedure:
1. Exporteer environment variables vanuit Render Dashboard
2. Sla op in een **veilige password manager** (1Password, LastPass, etc.)
3. **NIET** in Git of backup archive

---

## 📦 Restore Procedure

### 1. Codebase Restore
```bash
# Extract backup
tar -xzf backups/bureau-ai-mvp-backup-YYYYMMDD_HHMMSS.tar.gz

# Of voor Windows
Expand-Archive backups/bureau-ai-mvp-backup-YYYYMMDD_HHMMSS.zip

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with actual values
```

### 2. Database Restore
```bash
# Via Supabase Dashboard
# Of via command line:
psql $DATABASE_URL < database_backup.sql

# Of via Prisma migrations
npx prisma migrate deploy
```

### 3. Build & Deploy
```bash
# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Start (production)
npm start
```

---

## 🏷️ Git Tags

Voor versiebeheer, maak een Git tag:

```bash
# Create tag
git tag -a mvp-v1.0 -m "MVP 1.0 - Production Ready
- Bureau-AI personalization system
- LinkedIn & Blog generators
- Interview functionality
- Brainstorm & Content Bank tools
- Minimalist design system"

# Push tag
git push origin mvp-v1.0

# List tags
git tag -l

# Checkout specific version
git checkout mvp-v1.0
```

---

## 📍 Backup Locaties

### Aanbevolen Backup Storage:
1. **Git Repository** (GitHub/GitLab) - Code only
2. **Cloud Storage** (Google Drive, Dropbox, AWS S3) - Complete backup archive
3. **External Drive** - Offline backup
4. **Password Manager** - Environment variables

### Backup Schedule:
- **Code:** Elke commit naar Git (automatisch)
- **Complete Backup:** Maandelijks of bij belangrijke releases
- **Database:** Wekelijks (via Supabase)
- **Environment Variables:** Bij elke wijziging

---

## ✅ Backup Checklist

Voor een complete backup, zorg dat je hebt:

- [ ] Source code backup (via script of Git)
- [ ] Database backup (SQL dump)
- [ ] Environment variables (veilig opgeslagen)
- [ ] Prisma schema & migrations
- [ ] Configuratie bestanden
- [ ] Documentatie
- [ ] Git tag voor deze versie
- [ ] Test restore procedure

---

## 🚨 Belangrijke Notities

1. **Geen Secrets in Backup:** `.env` bestanden worden **NIET** meegenomen in backup
2. **Database Apart:** Database backup moet **apart** worden gemaakt
3. **Test Restore:** Test altijd de restore procedure na backup
4. **Multiple Locations:** Sla backups op meerdere locaties op
5. **Version Control:** Gebruik Git tags voor versiebeheer

---

## 📞 Support

Bij vragen over backup/restore:
- Check `BACKUP_MANIFEST.txt` in backup directory
- Review `DEPLOYMENT.md` voor deployment details
- Check Supabase dashboard voor database backups

---

**Laatste Update:** $(Get-Date -Format "yyyy-MM-dd")  
**Backup Versie:** 1.0

