# 🚀 Quick Start - Render Deployment

## Wat je moet doen (in 5 stappen):

### 1️⃣ Secrets genereren

**Windows (PowerShell):**
```powershell
.\scripts\generate-secrets.ps1
```

**Mac/Linux:**
```bash
npm run deploy:secrets
```

**Kopieer de 3 secrets** - je hebt ze nodig voor stap 3.

---

### 2️⃣ Code pushen naar GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

---

### 3️⃣ Render Services aanmaken

**Ga naar:** https://dashboard.render.com

#### A. Next.js Service

1. **New** → **Web Service**
2. Connect GitHub repo
3. Vul in:
   - Name: `agenthub-nextjs`
   - Environment: `Node`
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npm start`
4. **Environment Variables** (voeg toe):
   - `DATABASE_URL` = je Supabase connection string
   - `DIRECT_URL` = zelfde als DATABASE_URL
   - `NEXTAUTH_URL` = `https://agenthub-nextjs.onrender.com` (pas aan)
   - `NEXTAUTH_SECRET` = eerste secret uit stap 1
   - `AGENT_RUNTIME_URL` = `https://agenthub-agent-runtime.onrender.com` (pas aan na B)
   - `AGENT_RUNTIME_SECRET` = tweede secret uit stap 1
   - `AGENT_SERVICE_KEY` = derde secret uit stap 1
   - `OPENAI_API_KEY` = je OpenAI key
   - `OPENAI_MODEL` = `gpt-4.1-mini`
5. **Create Web Service**

#### B. Python Service

1. **New** → **Web Service**
2. Selecteer zelfde GitHub repo
3. Vul in:
   - Name: `agenthub-agent-runtime`
   - Environment: `Python 3`
   - Root Directory: `services/agent-runtime`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** (voeg toe):
   - `DATABASE_URL` = zelfde Supabase connection string
   - `AGENT_RUNTIME_SECRET` = **ZELFDE** als in Next.js
   - `AGENT_SERVICE_KEY` = **ZELFDE** als in Next.js
   - `OPENAI_API_KEY` = je OpenAI key
   - `OPENAI_MODEL` = `gpt-4.1-mini`
5. **Create Web Service**
6. **Wacht** tot service draait, noteer de URL
7. **Ga terug** naar Next.js service → Update `AGENT_RUNTIME_URL` met Python URL

---

### 4️⃣ Database Migraties

1. Ga naar Next.js service op Render
2. Klik **"Shell"** tab
3. Voer uit:
   ```bash
   npx prisma migrate deploy
   ```

---

### 5️⃣ Testen

- ✅ Next.js: `https://jouw-url.onrender.com/`
- ✅ Python: `https://agent-runtime-url.onrender.com/health`
- ✅ Login op je app
- ✅ Ga naar `/projects`
- ✅ Maak een project aan
- ✅ Upload een document

---

## 🎉 Klaar!

Je app draait nu live op Render!

---

## ❓ Problemen?

**Service start niet?**
- Check logs in Render Dashboard
- Check of alle environment variables zijn ingesteld

**Database errors?**
- Check `DATABASE_URL` - moet Supabase connection string zijn
- Voer `npx prisma migrate deploy` uit in Shell

**Agent runtime errors?**
- Check of Python service draait (`/health`)
- Check of `AGENT_RUNTIME_URL` correct is
- Check of `AGENT_RUNTIME_SECRET` **identiek** is in beide services

---

Voor meer details, zie `DEPLOYMENT_STEPS.md` of `DEPLOYMENT.md`

