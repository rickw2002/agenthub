# OAuth Redirect naar localhost:3000 Fix

## Probleem

Na het inloggen op Google Analytics krijg je:
```
ERR_CONNECTION_REFUSED
localhost refused to connect
```

Dit gebeurt omdat de OAuth callback probeert te redirecten naar `localhost:3000`, maar de Next.js app draait niet.

## Oplossing

### Optie 1: Start Next.js App Lokaal (Aanbevolen voor Development)

1. **Open een nieuwe terminal** (houd de Intel service terminal open)

2. **Start de Next.js app:**
   ```bash
   npm run dev
   ```

3. **Verifieer dat de app draait:**
   - Open http://localhost:3000 in je browser
   - Je zou de login pagina moeten zien

4. **Probeer opnieuw de Google Analytics connectie:**
   - Ga naar `/data`
   - Klik op "Verbinden" bij Google Analytics
   - Na het inloggen zou je terug moeten redirecten naar `localhost:3000/data/google-analytics?connected=1`

### Optie 2: Stel NEXTJS_BASE_URL in (Voor Productie)

Als je de Intel service op Render gebruikt maar lokaal test:

1. **In Render Dashboard:**
   - Ga naar je Intel service → Environment
   - Voeg toe: `NEXTJS_BASE_URL=https://jouw-nextjs-service.onrender.com`

2. **Lokaal (voor testing):**
   - Maak een `.env` file in `services/intel/`:
     ```
     NEXTJS_BASE_URL=http://localhost:3000
     ```
   - Of start de Intel service met:
     ```bash
     NEXTJS_BASE_URL=http://localhost:3000 uvicorn app.main:app --reload --port 8001
     ```

## Verificatie

Na het instellen, test de OAuth flow:

1. **Start beide services:**
   ```bash
   # Terminal 1: Next.js
   npm run dev
   
   # Terminal 2: Intel service
   cd services/intel
   .venv\Scripts\activate  # Windows
   uvicorn app.main:app --reload --port 8001
   ```

2. **Test de flow:**
   - Ga naar http://localhost:3000/data
   - Klik op "Verbinden" bij Google Analytics
   - Log in op Google
   - Je zou terug moeten redirecten naar `localhost:3000/data/google-analytics?connected=1`

## Troubleshooting

### "localhost refused to connect"
- **Oplossing:** Start de Next.js app met `npm run dev`

### "NEXTJS_BASE_URL not set"
- **Oplossing:** Stel `NEXTJS_BASE_URL` in in je `.env` file of Render environment variables

### Redirect gaat naar verkeerde URL
- **Check:** `NEXTJS_BASE_URL` moet exact de URL zijn waar je Next.js app draait
- **Lokaal:** `http://localhost:3000`
- **Productie:** `https://jouw-service.onrender.com`

### Intel service kan niet verbinden met Next.js
- **Check:** Beide services moeten draaien
- **Check:** CORS is geconfigureerd in Intel service (zou automatisch moeten werken)

