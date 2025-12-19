# Data Hub Migration Recovery Plan

**Datum:** 2024-12-19  
**Probleem:** Migration `20251219171000_datahub_workspace_not_null` gefaald (P3018)  
**Oorzaak:** Backfill gedraaid vóór migration #1 volledig actief was

---

## 1. Exacte CLI Commands voor Recovery

### Stap A: Markeer gefaalde migratie als rolled back

```bash
# Connect to your database (PostgreSQL)
psql $DATABASE_URL

# Of via Prisma Studio / je database client
```

**In PostgreSQL console:**

```sql
-- Check current migration status
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at 
FROM "_prisma_migrations" 
WHERE migration_name = '20251219171000_datahub_workspace_not_null';

-- Mark failed migration as rolled back (if it's stuck)
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20251219171000_datahub_workspace_not_null'
  AND rolled_back_at IS NULL;

-- Verify
SELECT migration_name, finished_at, rolled_back_at 
FROM "_prisma_migrations" 
WHERE migration_name = '20251219171000_datahub_workspace_not_null';
```

**Of via Prisma CLI (alternatief):**

```bash
# Check migration status
npx prisma migrate status

# If migration is marked as failed, manually mark as rolled back in DB
# Then reset Prisma migration state (ONLY if you're sure)
# npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null
```

**⚠️ BELANGRIJK:** Gebruik `migrate resolve` alleen als je zeker weet dat de migratie niet is toegepast.

---

### Stap B: Reset Prisma migration state

```bash
# Check huidige status
npx prisma migrate status

# Als de migratie nog als "failed" staat, markeer als rolled back:
npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null

# Verify dat Prisma nu schoon is
npx prisma migrate status
```

**Verwachte output na resolve:**
```
Database schema is up to date!
```

---

## 2. Verificatie: Bestaan workspaceId kolommen?

### SQL Queries om kolommen te verifiëren

```sql
-- Check of workspaceId kolommen bestaan in alle 4 tabellen
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('Connection', 'MetricDaily', 'Insight', 'ChatMessage')
  AND column_name = 'workspaceId'
ORDER BY table_name, column_name;
```

**Verwachte output:**
```
table_name   | column_name  | data_type | is_nullable | column_default
-------------|-------------|-----------|-------------|---------------
Connection   | workspaceId | text      | YES         | NULL
MetricDaily  | workspaceId | text      | YES         | NULL
Insight      | workspaceId | text      | YES         | NULL
ChatMessage  | workspaceId | text      | YES         | NULL
```

**Als `is_nullable = 'YES'`:** ✅ Kolommen bestaan en zijn nullable (correct voor nu)  
**Als kolommen ontbreken:** Migration #1 is niet volledig toegepast → zie recovery stap C

---

### Verificatie: Foreign Keys en Indexes

```sql
-- Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('Connection', 'MetricDaily', 'Insight', 'ChatMessage')
  AND kcu.column_name = 'workspaceId';
```

**Verwachte output:** 4 foreign keys naar `Workspace(id)`

```sql
-- Check indexes op workspaceId
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Connection', 'MetricDaily', 'Insight', 'ChatMessage')
  AND indexdef LIKE '%workspaceId%';
```

**Verwachte output:** Meerdere indexes per tabel (zie migration #1)

---

## 3. Juiste Herstelvolgorde (Lokaal / Staging)

### Scenario A: Kolommen bestaan al (migration #1 was succesvol)

```bash
# STAP 1: Reset Prisma migration state
npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null

# STAP 2: Verify Prisma is clean
npx prisma migrate status
# Expected: "Database schema is up to date!" (of alleen migration #1 applied)

# STAP 3: Run backfill script (vult workspaceId voor alle bestaande rows)
npm run datahub:backfill-workspace

# STAP 4: Verify geen NULLs meer (CRITICAL - moet passen)
npm run datahub:check-workspace
# Expected: "✅ All Data Hub workspaceId values are backfilled (no NULLs)."
# Exit code: 0

# STAP 5: Als check faalt → fix NULLs en herhaal stap 3-4
# Als check slaagt → ga door naar stap 6

# STAP 6: Deploy NOT NULL migration opnieuw
npx prisma migrate deploy
# Of voor dev: npx prisma migrate dev --name datahub_workspace_not_null

# STAP 7: Verify migratie succesvol
npx prisma migrate status

# STAP 8: Regenerate Prisma client
npx prisma generate

# STAP 9: Verify build
npm run build
```

---

### Scenario B: Kolommen bestaan NIET (migration #1 faalde ook)

```bash
# STAP 1: Check welke migraties zijn toegepast
npx prisma migrate status

# STAP 2: Als migration #1 ook gefaald is, markeer beide als rolled back
npx prisma migrate resolve --rolled-back 20251219170000_add_workspace_to_datahub_models
npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null

# STAP 3: Deploy migration #1 opnieuw (voegt nullable kolommen toe)
npx prisma migrate deploy
# Of: npx prisma migrate dev --name add_workspace_to_datahub_models

# STAP 4: Verify kolommen bestaan (zie SQL queries hierboven)

# STAP 5: Run backfill
npm run datahub:backfill-workspace

# STAP 6: Verify geen NULLs
npm run datahub:check-workspace

# STAP 7: Deploy NOT NULL migration
npx prisma migrate deploy

# STAP 8: Regenerate & build
npx prisma generate
npm run build
```

---

## 4. Bevestigingen

### ✅ DO-block NOT NULL migratie kan veilig opnieuw draaien

**Reden:**
- De migratie bevat een `DO $$` block dat **eerst alle NULLs telt**
- Als er NULLs zijn, faalt de migratie met een duidelijke error message
- **Geen data wordt gewijzigd** als de migratie faalt
- De `ALTER TABLE ... SET NOT NULL` statements worden alleen uitgevoerd als er 0 NULLs zijn

**Code in migratie:**
```sql
-- Count NULLs first
SELECT COUNT(*) INTO connection_nulls FROM "Connection" WHERE "workspaceId" IS NULL;
-- ... (andere tabellen)

-- Fail if any NULLs exist
IF connection_nulls > 0 OR ... THEN
  RAISE EXCEPTION 'Cannot enforce NOT NULL: NULL values found...';
END IF;

-- Only if no NULLs: enforce NOT NULL
ALTER TABLE "Connection" ALTER COLUMN "workspaceId" SET NOT NULL;
```

**Conclusie:** ✅ Veilig om opnieuw te draaien. Faalt automatisch als er nog NULLs zijn.

---

### ✅ Bestaande data gaat niet verloren

**Redenen:**
1. **Migration #1 (nullable columns):** Voegt alleen kolommen toe, wijzigt geen bestaande data
2. **Backfill script:** Update alleen `workspaceId` waar `IS NULL`, idempotent (veilig om meerdere keren te draaien)
3. **Migration #2 (NOT NULL):** Wijzigt alleen constraint, geen data wijzigingen
4. **DO-block check:** Voorkomt dat NOT NULL wordt toegepast als er NULLs zijn

**Data integriteit:**
- Alle bestaande rows blijven intact
- `userId` blijft behouden (niet verwijderd)
- Foreign keys naar `Workspace` zijn al aanwezig (CASCADE delete)
- Indexes zijn al aangemaakt

**Conclusie:** ✅ Geen data verlies mogelijk.

---

### ✅ Prisma accepteert daarna normale migraties

**Na recovery:**
1. `npx prisma migrate status` toont: "Database schema is up to date!"
2. `_prisma_migrations` tabel heeft beide migraties als `finished_at` (niet `rolled_back_at`)
3. Prisma schema matcht database schema
4. Nieuwe migraties kunnen normaal worden aangemaakt en gedeployed

**Verificatie:**
```bash
# Check migration status
npx prisma migrate status

# Test nieuwe migratie (optioneel)
npx prisma migrate dev --name test_migration --create-only
# Verwijder test_migration folder daarna
```

**Conclusie:** ✅ Prisma staat weer in normale state na recovery.

---

## 5. Quick Reference: Recovery Commands

```bash
# 1. Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null

# 2. Verify status
npx prisma migrate status

# 3. Backfill workspaceIds
npm run datahub:backfill-workspace

# 4. Verify no NULLs (MUST PASS)
npm run datahub:check-workspace

# 5. Deploy NOT NULL migration
npx prisma migrate deploy

# 6. Regenerate & verify
npx prisma generate
npm run build
```

---

## 6. Troubleshooting

### Als `migrate resolve` niet werkt:

```sql
-- Handmatig in database:
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20251219171000_datahub_workspace_not_null'
  AND rolled_back_at IS NULL;
```

### Als backfill faalt:

```bash
# Check of er users zijn
npx prisma studio
# Navigate to User table, verify users exist

# Check of Workspace records bestaan
# In Prisma Studio: Workspace table

# Run backfill opnieuw (idempotent, veilig)
npm run datahub:backfill-workspace
```

### Als check script NULLs vindt:

```sql
-- Manual check welke rows NULL hebben
SELECT COUNT(*), 'Connection' as table_name FROM "Connection" WHERE "workspaceId" IS NULL
UNION ALL
SELECT COUNT(*), 'MetricDaily' FROM "MetricDaily" WHERE "workspaceId" IS NULL
UNION ALL
SELECT COUNT(*), 'Insight' FROM "Insight" WHERE "workspaceId" IS NULL
UNION ALL
SELECT COUNT(*), 'ChatMessage' FROM "ChatMessage" WHERE "workspaceId" IS NULL;

-- Fix: Run backfill opnieuw
npm run datahub:backfill-workspace
```

---

## 7. Final Checklist

Voor productie deployment:

- [ ] Migration #1 is toegepast (kolommen bestaan, nullable)
- [ ] Backfill script is gedraaid en succesvol
- [ ] Check script toont 0 NULLs (exit code 0)
- [ ] Prisma migration state is clean (`migrate status` = up to date)
- [ ] NOT NULL migratie kan veilig worden gedeployed
- [ ] Na deployment: `migrate status` toont beide migraties als applied
- [ ] `npx prisma generate` werkt zonder errors
- [ ] `npm run build` slaagt
- [ ] Application start zonder database errors

---

**Status:** ✅ Recovery plan compleet. Volg stappen 1-3 voor veilige recovery.

