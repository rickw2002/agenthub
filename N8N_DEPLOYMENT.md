# 🚀 n8n Deployment op Render - Stap voor Stap

Deze handleiding helpt je om n8n op Render te deployen en de oude Python FastAPI service te verwijderen.

---

## 📋 Overzicht

**Wat we gaan doen:**
1. ✅ n8n service aanmaken op Render
2. ✅ Environment variables configureren
3. ✅ Next.js service updaten met n8n configuratie
4. ✅ Oude Python service verwijderen uit Render
5. ✅ Verificatie dat alles werkt

**Tijd:** ~15-20 minuten

---

## 🎯 Stap 1: n8n Service Aanmaken op Render

### 1.1 Ga naar Render Dashboard

1. Open https://dashboard.render.com
2. Log in met je account

### 1.2 Nieuwe Web Service Aanmaken

1. Klik op **"New"** → **"Web Service"**
2. Selecteer je GitHub repository (dezelfde als je Next.js app)
3. Vul de volgende instellingen in:

**Basic Settings:**
- **Name**: `bureau-ai-n8n` (of kies je eigen naam)
- **Language**: `Node` ⚠️ **Kies gewoon "Node" - dit maakt niet uit!**
  - Render detecteert automatisch de `Dockerfile` en gebruikt die in plaats van Node
  - Er is GEEN "Docker" optie in de dropdown - dat is normaal!
- **Region**: `Virginia` (of dezelfde als je Next.js service)
- **Branch**: `main` (of je deployment branch)
- **Root Directory**: *(leeg laten)*

**Build & Start:**
- **Build Command**: *(probeer eerst leeg te laten - als Render het vereist, gebruik dan: `echo "Docker build"`)*
- **Start Command**: *(probeer eerst leeg te laten - als Render het vereist, gebruik dan: `n8n start`)*

**⚠️ BELANGRIJK - Twee Opties:**

**Optie 1: Render detecteert Dockerfile automatisch (aanbevolen)**
- Laat Build en Start commands leeg
- Render detecteert automatisch de `Dockerfile` in de root
- Als de velden verplicht zijn, gebruik Optie 2

**Optie 2: Als Render Build/Start commands vereist**
- **Build Command**: `echo "Building with Dockerfile"`
- **Start Command**: `n8n start`
- Render zal nog steeds de Dockerfile gebruiken als die in de root staat
- De n8n Docker image start automatisch met `n8n start` als CMD

**Verificatie:**
- Check de Logs tab na deployment
- Je zou moeten zien dat Docker wordt gebruikt, niet npm

### 1.3 Dockerfile Controleren

**Zorg dat de `Dockerfile` in de root van je repository staat!**

De Dockerfile is al aangemaakt en staat in de root. Controleer of deze bestaat:

```dockerfile
FROM n8nio/n8n:latest

# n8n draait standaard op poort 5678
EXPOSE 5678

# n8n start automatisch via de base image CMD
```

**Verificatie na deployment:**
- Na het aanmaken van de service, check de **Logs** tab
- Je zou moeten zien: `Building Docker image...` of `Detected Dockerfile`
- Als je `npm install` ziet, dan gebruikt Render nog Node - check of Dockerfile in root staat en gepusht is naar GitHub

---

## 🔐 Stap 2: Environment Variables voor n8n

In je n8n service op Render, ga naar **Settings** → **Environment** en voeg toe:

### Verplichte Variabelen:

```bash
# n8n Basis Configuratie
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https

# Database (gebruik dezelfde Supabase database als Next.js)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<je-supabase-host>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=<je-database-naam>
DB_POSTGRESDB_USER=<je-database-user>
DB_POSTGRESDB_PASSWORD=<je-database-password>
DB_POSTGRESDB_SSL_ENABLED=true

# Security (genereer een willekeurige string)
N8N_ENCRYPTION_KEY=<genereer-met-openssl-rand-base64-32>
WEBHOOK_URL=https://bureau-ai-n8n.onrender.com

# Optioneel: Basic Auth (aanbevolen voor productie)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<genereer-een-veilig-wachtwoord>
```

### Hoe je Supabase Database Credentials vindt:

1. Ga naar je Supabase project dashboard
2. Ga naar **Settings** → **Database**
3. Kopieer de connection string of de individuele waarden:
   - Host: `db.xxxxx.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (je database password)

### Secrets Genereren:

```bash
# N8N_ENCRYPTION_KEY genereren
openssl rand -base64 32

# N8N_BASIC_AUTH_PASSWORD genereren (of kies zelf een sterk wachtwoord)
openssl rand -base64 16
```

---

## 🔄 Stap 3: Next.js Service Updaten

### 3.1 Verwijder Oude Python Runtime Variabelen

In je Next.js service op Render:

1. Ga naar **Settings** → **Environment**
2. **Verwijder** deze variabelen (als ze er nog zijn):
   - `AGENT_RUNTIME_URL`
   - `AGENT_RUNTIME_SECRET`

### 3.2 Voeg n8n Variabelen Toe

Voeg deze nieuwe variabelen toe aan je Next.js service:

```bash
# n8n Configuration
N8N_BASE_URL=https://bureau-ai-n8n.onrender.com
N8N_WEBHOOK_SECRET=<genereer-een-willekeurige-string>
N8N_PROJECT_CHAT_WEBHOOK_PATH=/webhook/bureau-ai/project-chat

# Agent Service Key (blijft hetzelfde, voor callbacks)
AGENT_SERVICE_KEY=<je-bestaande-AGENT_SERVICE_KEY>
```

**⚠️ Belangrijk:**
- `N8N_BASE_URL` moet de URL zijn van je n8n service op Render
- `N8N_WEBHOOK_SECRET` moet je ook in n8n workflows gebruiken voor authenticatie
- `AGENT_SERVICE_KEY` blijft hetzelfde (voor `/api/runs/callback`)

### 3.3 Update render.yaml (Optioneel)

Als je `render.yaml` gebruikt, update deze dan:

```yaml
services:
  # Next.js Main Application
  - type: web
    name: bureau-ai-nextjs
    env: node
    region: frankfurt
    plan: starter
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: DIRECT_URL
        sync: false
      - key: NEXTAUTH_URL
        sync: false
      - key: NEXTAUTH_SECRET
        sync: false
      - key: N8N_BASE_URL
        sync: false
      - key: N8N_WEBHOOK_SECRET
        sync: false
      - key: N8N_PROJECT_CHAT_WEBHOOK_PATH
        value: /webhook/bureau-ai/project-chat
        sync: false
      - key: AGENT_SERVICE_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: OPENAI_MODEL
        value: gpt-4.1-mini
        sync: false
    healthCheckPath: /
    autoDeploy: true

  # n8n Workflow Engine
  - type: web
    name: bureau-ai-n8n
    env: docker
    region: frankfurt
    plan: starter
    dockerfilePath: ./Dockerfile
    envVars:
      - key: N8N_HOST
        value: 0.0.0.0
        sync: false
      - key: N8N_PORT
        value: "5678"
        sync: false
      - key: N8N_PROTOCOL
        value: https
        sync: false
      - key: DB_TYPE
        value: postgresdb
        sync: false
      - key: DB_POSTGRESDB_HOST
        sync: false
      - key: DB_POSTGRESDB_PORT
        value: "5432"
        sync: false
      - key: DB_POSTGRESDB_DATABASE
        sync: false
      - key: DB_POSTGRESDB_USER
        sync: false
      - key: DB_POSTGRESDB_PASSWORD
        sync: false
      - key: DB_POSTGRESDB_SSL_ENABLED
        value: "true"
        sync: false
      - key: N8N_ENCRYPTION_KEY
        sync: false
      - key: WEBHOOK_URL
        sync: false
      - key: N8N_BASIC_AUTH_ACTIVE
        value: "true"
        sync: false
      - key: N8N_BASIC_AUTH_USER
        value: admin
        sync: false
      - key: N8N_BASIC_AUTH_PASSWORD
        sync: false
    healthCheckPath: /
    autoDeploy: true
```

---

## 🗑️ Stap 4: Oude Python Service Verwijderen

### 4.1 Stop de Python Service

1. Ga naar je Python service (`agenthub-agent-runtime` of vergelijkbaar)
2. Klik op **Settings** → scroll naar beneden
3. Klik op **"Delete Service"**
4. Bevestig de verwijdering

**⚠️ Let op:** Zorg ervoor dat je Next.js service al de nieuwe n8n configuratie heeft voordat je de Python service verwijdert!

### 4.2 Verwijder Python Code (Optioneel)

Als je de Python code ook uit je repository wilt verwijderen:

```bash
# Lokaal op je computer
rm -rf services/agent-runtime

# Commit en push
git add .
git commit -m "Remove Python FastAPI runtime - migrated to n8n"
git push origin main
```

**⚠️ Let op:** Dit is optioneel. Je kunt de code ook gewoon laten staan als backup.

---

## ✅ Stap 5: Verificatie

### 5.1 Test n8n Service

1. Wacht tot n8n service volledig is gedeployed (kan 5-10 minuten duren)
2. Ga naar: `https://bureau-ai-n8n.onrender.com`
3. Je zou de n8n login pagina moeten zien (als Basic Auth is ingeschakeld)
4. Log in met je `N8N_BASIC_AUTH_USER` en `N8N_BASIC_AUTH_PASSWORD`

### 5.2 Test Next.js → n8n Connectie

1. Ga naar je Next.js app: `https://jouw-app.onrender.com`
2. Log in
3. Test een agent run of project chat
4. Check de logs in beide services om te zien of de webhook calls werken

### 5.3 Check Logs

**In Render:**
- Ga naar je n8n service → **Logs** tab
- Je zou requests moeten zien binnenkomen van Next.js
- Check voor errors

**In Next.js service:**
- Ga naar **Logs** tab
- Check voor n8n webhook errors
- Als je `N8N_BASE_URL is not set` ziet, controleer je environment variables

---

## 🔧 Troubleshooting

### n8n start niet op

**Probleem:** n8n service crasht of start niet

**Oplossing:**
1. Check de logs in Render
2. Controleer of alle database credentials correct zijn
3. Zorg dat `N8N_ENCRYPTION_KEY` is ingesteld
4. Check of de database toegankelijk is vanuit Render (Supabase firewall settings)

### Next.js kan n8n niet bereiken

**Probleem:** `Failed to reach n8n webhook` errors

**Oplossing:**
1. Controleer `N8N_BASE_URL` in Next.js service (moet exact de Render URL zijn)
2. Check of n8n service draait (ga naar de URL in browser)
3. Controleer `N8N_WEBHOOK_SECRET` - moet hetzelfde zijn als wat je in n8n workflows gebruikt
4. Check firewall/network settings in Render

### Database Connection Errors

**Probleem:** n8n kan niet verbinden met Supabase database

**Oplossing:**
1. Check Supabase dashboard → **Settings** → **Database** → **Connection Pooling**
2. Zorg dat je de juiste connection string gebruikt (niet de pooler, maar direct connection)
3. Check Supabase firewall - voeg Render IP ranges toe indien nodig
4. Controleer SSL settings (`DB_POSTGRESDB_SSL_ENABLED=true`)

---

## 📝 Checklist

Gebruik deze checklist om te verifiëren dat alles werkt:

- [ ] n8n service is aangemaakt op Render
- [ ] n8n service draait en is bereikbaar via URL
- [ ] n8n database connectie werkt (check logs)
- [ ] Next.js service heeft `N8N_BASE_URL` en `N8N_WEBHOOK_SECRET` ingesteld
- [ ] Oude `AGENT_RUNTIME_URL` en `AGENT_RUNTIME_SECRET` zijn verwijderd uit Next.js
- [ ] Python service is gestopt/verwijderd uit Render
- [ ] Test agent run werkt (check logs)
- [ ] Test project chat werkt (check logs)
- [ ] Geen errors in beide service logs

---

## 🎉 Klaar!

Als alles werkt, ben je klaar! Je gebruikt nu n8n in plaats van de Python FastAPI runtime.

**Volgende stappen:**
1. Maak je eerste n8n workflow voor agent execution
2. Configureer webhooks in n8n met het `N8N_WEBHOOK_SECRET`
3. Test end-to-end workflows

**Hulp nodig?** Check de n8n documentatie: https://docs.n8n.io

