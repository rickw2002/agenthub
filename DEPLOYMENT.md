
# Deployment Guide - AgentHub

## 🚀 Quick Start

### Stap 1: Render Dashboard Setup

1. **Ga naar Render Dashboard**: https://dashboard.render.com
2. **Maak 2 nieuwe Web Services aan** (of gebruik `render.yaml` voor automatische setup)

---

## 📋 Service 1: Next.js Application

### Configuratie in Render:

**Basic Settings:**
- **Name**: `agenthub-nextjs` (of kies je eigen naam)
- **Environment**: `Node`
- **Region**: `Frankfurt` (of dichtstbijzijnde)
- **Branch**: `main` (of je deployment branch)
- **Root Directory**: *(leeg - root van repo)*

**Build & Start:**
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`

**Environment Variables** (Settings → Environment):
```
DATABASE_URL=postgresql://... (je Supabase connection string)
DIRECT_URL=postgresql://... (zelfde als DATABASE_URL)
NEXTAUTH_URL=https://jouw-app-naam.onrender.com
NEXTAUTH_SECRET=<genereer met: openssl rand -base64 32>
AGENT_RUNTIME_URL=https://agent-runtime-naam.onrender.com
AGENT_RUNTIME_SECRET=<genereer een willekeurige string>
AGENT_SERVICE_KEY=<genereer een willekeurige string>
OPENAI_API_KEY=sk-... (je OpenAI API key)
OPENAI_MODEL=gpt-4.1-mini
```

**Health Check:**
- **Health Check Path**: `/`

---

## 🐍 Service 2: Python Agent Runtime

### Configuratie in Render:

**Basic Settings:**
- **Name**: `agenthub-agent-runtime` (of kies je eigen naam)
- **Environment**: `Python 3`
- **Region**: `Frankfurt` (zelfde als Next.js)
- **Branch**: `main` (of je deployment branch)
- **Root Directory**: `services/agent-runtime`

**Build & Start:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables** (Settings → Environment):
```
DATABASE_URL=postgresql://... (zelfde Supabase database)
AGENT_RUNTIME_SECRET=<ZELFDE ALS IN NEXT.JS>
AGENT_SERVICE_KEY=<ZELFDE ALS IN NEXT.JS>
OPENAI_API_KEY=sk-... (je OpenAI API key)
OPENAI_MODEL=gpt-4.1-mini
```

**Health Check:**
- **Health Check Path**: `/health`

---

## 🔧 Stap 2: Database Migraties

**Na de eerste deployment van Next.js:**

1. Ga naar je Next.js service op Render
2. Klik op **"Shell"** tab
3. Voer uit:
   ```bash
   npx prisma migrate deploy
   ```

Dit past alle pending migrations toe, inclusief:
- Project models
- Document scope & status enums

---

## ✅ Stap 3: Verificatie

### Test deze endpoints:

1. **Next.js Health**: `https://jouw-app.onrender.com/`
2. **Python Health**: `https://agent-runtime.onrender.com/health`
3. **Login**: `https://jouw-app.onrender.com/auth/login`
4. **Projects**: `https://jouw-app.onrender.com/projects`

### Test functionaliteit:

- [ ] Login werkt
- [ ] Projects pagina laadt
- [ ] Project aanmaken werkt
- [ ] Document upload werkt (Library of Project)
- [ ] Chat in project werkt

---

## 🔐 Secrets Genereren

### NEXTAUTH_SECRET genereren:
```bash
openssl rand -base64 32
```

### AGENT_RUNTIME_SECRET genereren:
```bash
openssl rand -base64 32
```
*(Gebruik dezelfde waarde in beide services)*

### AGENT_SERVICE_KEY genereren:
```bash
openssl rand -base64 32
```
*(Gebruik dezelfde waarde in beide services)*

---

## 🐛 Troubleshooting

### "Migration not applied"
```bash
# In Render Shell van Next.js service:
npx prisma migrate deploy
```

### "Cannot connect to agent runtime"
- Controleer `AGENT_RUNTIME_URL` in Next.js (moet eindigen zonder trailing slash)
- Controleer of Python service draait (ga naar `/health`)
- Controleer `AGENT_RUNTIME_SECRET` - moet identiek zijn in beide services

### "Prisma Client errors"
- Zorg dat build command `npx prisma generate` bevat
- Of voer handmatig uit in Shell: `npx prisma generate`

### "Python service crashes"
- Controleer logs in Render Dashboard
- Controleer of alle environment variables zijn ingesteld
- Controleer of `DATABASE_URL` correct is

---

## 📝 Deployment Checklist

**Voor eerste deployment:**
- [ ] Render account aangemaakt
- [ ] GitHub repository connected
- [ ] 2 Web Services aangemaakt (Next.js + Python)
- [ ] Alle environment variables ingesteld
- [ ] Secrets gegenereerd en ingesteld
- [ ] Build commands correct ingesteld
- [ ] Services gedeployed
- [ ] Database migraties uitgevoerd (`prisma migrate deploy`)
- [ ] Health checks slagen
- [ ] Login werkt
- [ ] Projects functionaliteit werkt

**Voor updates:**
- [ ] Code gepusht naar GitHub
- [ ] Auto-deploy triggert (of manual deploy)
- [ ] Build slaagt
- [ ] Health checks slagen
- [ ] Functionaliteit getest

---

## 🔄 Auto-Deploy Setup

Render kan automatisch deployen bij elke push naar `main`:

1. Ga naar service → Settings
2. Zet **"Auto-Deploy"** aan
3. Selecteer branch: `main` (of je deployment branch)

Nu wordt er automatisch gedeployed bij elke push!

---

## 📞 Support

Als er problemen zijn:
1. Check de logs in Render Dashboard
2. Check de Shell voor database issues
3. Verifieer alle environment variables
4. Test health endpoints

