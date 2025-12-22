# Waar vind je DATABASE_URL en DIRECT_URL in Supabase?

## Stap 1: Ga naar je Supabase Dashboard

1. Open https://app.supabase.com
2. Log in met je account
3. Selecteer je project (bijv. `bureau-ai`)

## Stap 2: Vind de Database Connection String

### Optie A: Via Settings → Database (Aanbevolen)

1. Klik op **Settings** (tandwiel icoon) in de linker sidebar
2. Klik op **Database** in het menu
3. Scroll naar beneden naar **Connection string**
4. Je ziet verschillende tabs:
   - **URI** - Dit is wat je nodig hebt
   - **JDBC** - Voor Java
   - **Golang** - Voor Go
   - **Python** - Voor Python
   - **Node.js** - Voor Node.js

5. Klik op de **URI** tab
6. Je ziet twee opties:
   - **Connection pooling** (Session mode) - Gebruik dit NIET voor Prisma migrations
   - **Direct connection** - Gebruik dit voor DIRECT_URL

### Optie B: Via Project Settings → Database

1. Klik op **Project Settings** (tandwiel icoon bovenaan)
2. Klik op **Database** in het linker menu
3. Scroll naar **Connection string**
4. Kies **URI** tab
5. Kies **Direct connection** (niet Connection pooling)

## Stap 3: Kopieer de Connection String

Je ziet iets als:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**BELANGRIJK:** Dit is de **pooler** connection (poort 6543). Voor Prisma migrations heb je de **direct** connection nodig (poort 5432).

## Stap 4: Gebruik Direct Connection (voor DIRECT_URL)

1. In de **Connection string** sectie, zoek naar **Direct connection**
2. Of gebruik dit formaat:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**Voorbeeld:**
- Project Reference: `vibujitcmqjvikwftrpx`
- Password: `mijn-wachtwoord-123`
- Direct URL: `postgresql://postgres:mijn-wachtwoord-123@db.vibujitcmqjvikwftrpx.supabase.co:5432/postgres`

## Stap 5: Voeg sslmode=require toe

Voor Supabase moet je `sslmode=require` toevoegen aan het einde:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**Voorbeeld:**
```
postgresql://postgres:mijn-wachtwoord-123@db.vibujitcmqjvikwftrpx.supabase.co:5432/postgres?sslmode=require
```

## Stap 6: URL Encode Speciale Karakters in Wachtwoord

Als je wachtwoord speciale karakters bevat, moet je deze URL encoden:

| Karakter | Encoded |
|----------|---------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `*` | `%2A` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |

**Voorbeeld:**
- Wachtwoord: `MyP@ss!123`
- Encoded: `MyP%40ss%21123`
- Volledige URL: `postgresql://postgres:MyP%40ss%21123@db.vibujitcmqjvikwftrpx.supabase.co:5432/postgres?sslmode=require`

## Stap 7: Stel in Render

### Voor Next.js Service (agenthub):

1. Ga naar Render Dashboard
2. Klik op je **Next.js service** (bijv. `bureau-ai-nextjs`)
3. Klik op **Environment** in het linker menu
4. Zoek of voeg toe:

**DATABASE_URL:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public&sslmode=require
```

**DIRECT_URL:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public&sslmode=require
```

**BELANGRIJK:** 
- Beide URLs zijn **identiek** voor Supabase
- Gebruik **direct connection** (poort 5432), niet pooler (poort 6543)
- Voeg `?schema=public&sslmode=require` toe
- URL encode speciale karakters in wachtwoord

### Voor Intel Service (FastAPI):

1. Ga naar Render Dashboard
2. Klik op je **Intel service** (bijv. `bureau-ai-intel`)
3. Klik op **Environment**
4. Voeg toe:

**DATABASE_URL:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

(Intel service heeft geen DIRECT_URL nodig, alleen DATABASE_URL)

## Volledig Voorbeeld

Stel je hebt:
- Project Reference: `vibujitcmqjvikwftrpx`
- Password: `MyP@ss!123`

**Voor Render Environment Variables:**

**DATABASE_URL:**
```
postgresql://postgres:MyP%40ss%21123@db.vibujitcmqjvikwftrpx.supabase.co:5432/postgres?schema=public&sslmode=require
```

**DIRECT_URL:**
```
postgresql://postgres:MyP%40ss%21123@db.vibujitcmqjvikwftrpx.supabase.co:5432/postgres?schema=public&sslmode=require
```

## Waar vind je je Project Reference?

1. Ga naar Supabase Dashboard
2. Klik op **Settings** → **General**
3. Scroll naar **Reference ID**
4. Dit is je `[PROJECT-REF]` (bijv. `vibujitcmqjvikwftrpx`)

## Waar vind je je Database Password?

1. Ga naar Supabase Dashboard
2. Klik op **Settings** → **Database**
3. Scroll naar **Database password**
4. Als je het niet weet, klik op **Reset database password**
5. **BELANGRIJK:** Kopieer het nieuwe wachtwoord direct, je ziet het maar één keer!

## Verificatie

Na het instellen in Render, test de connectie:

```bash
# Lokaal testen (met .env file)
npx prisma migrate status
```

Als dit werkt, werkt het ook op Render tijdens de build.

## Troubleshooting

### "Can't reach database server"
- Check of Supabase project niet gepauzeerd is
- Check of IPv4 compatibility is ingeschakeld in Supabase
- Check of je poort 5432 gebruikt (direct), niet 6543 (pooler)

### "Authentication failed"
- Check of wachtwoord correct is
- Check of speciale karakters zijn URL encoded
- Check of username `postgres` is (Supabase default)

### "SSL connection required"
- Zorg dat `sslmode=require` in de URL staat
- Check of je `?sslmode=require` of `&sslmode=require` gebruikt (afhankelijk van of er al een `?` in de URL staat)

