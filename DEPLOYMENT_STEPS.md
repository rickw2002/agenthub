# 🚀 Deployment Stappen - Simpel Overzicht

## Wat je NU moet doen (in volgorde):

### ✅ Stap 1: Secrets genereren (5 minuten)

**Lokaal op je computer:**

```bash
npm run deploy:secrets
```

Dit geeft je 3 geheime strings. Kopieer deze - je hebt ze nodig voor Stap 3.

---

### ✅ Stap 2: Code naar GitHub pushen (2 minuten)

**Zorg dat alle code op GitHub staat:**

```bash
git add .
git commit -m "Add projects, documents, and chat features"
git push origin main
```

---

### ✅ Stap 3: Render Dashboard - Services aanmaken (10 minuten)

**Ga naar:** https://dashboard.render.com

#### Service 1: Next.js App

1. Klik **"New"** → **"Web Service"**
2. Connect je GitHub repository
3. Vul in:
   - **Name**: `agenthub-nextjs`
   - **Environment**: `Node`
   - **Region**: `Frankfurt` (of dichtstbijzijnde)
   - **Branch**: `main`
   - **Root Directory**: *(leeg laten)*
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

4. Klik **"Advanced"** → **"Add Environment Variable"**
   
   Voeg deze toe (gebruik de secrets uit Stap 1):
   ```
   DATABASE_URL = <je Supabase connection string>
   DIRECT_URL = <zelfde als DATABASE_URL>
   NEXTAUTH_URL = https://agenthub-nextjs.onrender.com (pas aan naar jouw URL)
   NEXTAUTH_SECRET = <eerste secret uit Stap 1>
   AGENT_RUNTIME_URL = https://agenthub-agent-runtime.onrender.com (pas aan na Stap 3.2)
   AGENT_RUNTIME_SECRET = <tweede secret uit Stap 1>
   AGENT_SERVICE_KEY = <derde secret uit Stap 1>
   OPENAI_API_KEY = <je OpenAI key>
   OPENAI_MODEL = gpt-4.1-mini
   ```

5. Klik **"Create Web Service"**

#### Service 2: Python Runtime

1. Klik **"New"** → **"Web Service"**
2. Selecteer dezelfde GitHub repository
3. Vul in:
   - **Name**: `agenthub-agent-runtime`
   - **Environment**: `Python 3`
   - **Region**: `Frankfurt` (zelfde als Next.js)
   - **Branch**: `main`
   - **Root Directory**: `services/agent-runtime`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. Klik **"Advanced"** → **"Add Environment Variable"**
   
   Voeg deze toe:
   ```
   DATABASE_URL = <zelfde Supabase connection string>
   AGENT_RUNTIME_SECRET = <ZELFDE als in Next.js service>
   AGENT_SERVICE_KEY = <ZELFDE als in Next.js service>
   OPENAI_API_KEY = <je OpenAI key>
   OPENAI_MODEL = gpt-4.1-mini
   ```

5. Klik **"Create Web Service"**

6. **WACHT** tot deze service draait, noteer de URL (bijv. `https://agenthub-agent-runtime.onrender.com`)

7. **GA TERUG** naar je Next.js service → Settings → Environment
8. **UPDATE** `AGENT_RUNTIME_URL` met de juiste Python service URL

---

### ✅ Stap 4: Database Migraties (2 minuten)

**Nadat beide services draaien:**

1. Ga naar je **Next.js service** op Render
2. Klik op **"Shell"** tab (rechtsboven)
3. Voer uit:
   ```bash
   npx prisma migrate deploy
   ```
4. Wacht tot het klaar is (ziet "All migrations have been applied")

---

### ✅ Stap 5: Testen (5 minuten)

**Test deze URLs:**

1. Next.js: `https://jouw-nextjs-url.onrender.com/`
   - Moet de login pagina tonen

2. Python: `https://jouw-python-url.onrender.com/health`
   - Moet `{"status":"ok"}` teruggeven

3. Login op je app
4. Ga naar `/projects` - zou moeten werken
5. Maak een test project aan
6. Upload een document (Library of Project)

---

## 🎉 Klaar!

Als alles werkt, ben je klaar! Je app draait nu live.

---

## ❓ Problemen?

### Service start niet
- Check de logs in Render Dashboard
- Check of alle environment variables zijn ingesteld

### "Cannot connect to database"
- Check `DATABASE_URL` - moet Supabase connection string zijn
- Check of Supabase database actief is

### "Agent runtime error"
- Check of Python service draait (`/health` endpoint)
- Check of `AGENT_RUNTIME_URL` correct is in Next.js
- Check of `AGENT_RUNTIME_SECRET` hetzelfde is in beide services

### Migraties falen
- Voer handmatig uit in Shell: `npx prisma migrate deploy`
- Check of `DATABASE_URL` correct is

---

## 📞 Hulp nodig?

Check de logs in Render Dashboard → je service → Logs tab

