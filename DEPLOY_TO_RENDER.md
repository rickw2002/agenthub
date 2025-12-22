# Deploy Bureau-AI v2 naar Render

## Stap 0: Navigeer naar project directory

```bash
cd "C:\Users\rick_\Desktop\cursor\ai platform"
```

OF als je al in de juiste directory bent, check met:

```bash
pwd
# (PowerShell: Get-Location)
```

## Stap 1: Check wat er open staat

```bash
git status
```

## Stap 2: Voeg alle bestanden toe

```bash
git add .
```

## Stap 3: Commit met deze message

```bash
git commit -m "feat: Bureau-AI v2 - Multi-provider Content & Decision Engine

PR1: Add v2 models (Signal, InsightV2, ContentDraftV2, WeeklyReportV2, ContentFeedbackV2)
PR2: GA4 sync writes to Signal table + provider status endpoint
PR3: Intelligence generation pipeline (Signals → InsightV2 via LLM)
PR4: Content Studio v2 UI (generate LinkedIn posts, editor, feedback)
PR5: Weekly reports generation + archive UI

- New Prisma migration for v2 models
- Intel service: Signals ingest, intelligence generation, weekly reports
- Next.js: Content Studio and Reports UI routes
- Updated .gitignore for Python cache files"
```

## Stap 4: Push naar GitHub

```bash
git push origin main
```

## Stap 5: Check Render Dashboard

1. Ga naar Render Dashboard
2. Check Next.js service → Logs (build moet slagen)
3. Check Intel service → Logs (service moet starten)
4. Database migratie gebeurt automatisch tijdens Next.js build

## Stap 6: Environment Variables (Intel Service)

⚠️ **BELANGRIJK**: Voeg deze toe aan Intel service in Render:

- `OPENAI_API_KEY` = (jouw OpenAI API key)
- `OPENAI_MODEL` = `gpt-4.1-mini` (optioneel, dit is de default)

## Stap 7: Test na deployment

1. Test `/app/[workspace]/content` - Content Studio
2. Test `/app/[workspace]/reports` - Weekly Reports
3. Test `POST /intelligence/generate` via Next.js proxy
4. Check provider status: `GET /providers/status?workspaceId=...`

---

## Troubleshooting

### Als build faalt:
- Check Render logs voor exacte error
- Database migratie: check of `DATABASE_URL` en `DIRECT_URL` correct zijn
- Prisma: check of `npx prisma migrate deploy` succesvol is

### Als Intel service niet start:
- Check of `OPENAI_API_KEY` is toegevoegd
- Check logs voor Python errors
- Check of `requirements.txt` correct is (openai>=1.55.0)

### Als database errors:
- Check Supabase connection
- Check of migratie is uitgevoerd: `SELECT * FROM "Signal" LIMIT 1;`
