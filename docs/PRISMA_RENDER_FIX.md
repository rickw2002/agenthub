# Prisma Database Connection Fix for Render

## Problem

Prisma migrations fail during Render build with error:
```
Error: P1001: Can't reach database server at `db.vibujitcmqjvikwftrpx.supabase.co:5432`
```

## Root Causes

1. **DIRECT_URL not set in Render** - Prisma requires `DIRECT_URL` for migrations (separate from `DATABASE_URL` for connection pooling)
2. **Missing `sslmode=require`** - Supabase requires SSL connections
3. **Password URL encoding** - Special characters in password must be URL encoded
4. **Build command missing `prisma migrate deploy`** - Migrations must run during build

## Solution

### 1. Set DIRECT_URL in Render

In Render Dashboard → Your Next.js Service → Environment:

**DIRECT_URL** must be set to the same value as DATABASE_URL:
```
postgresql://postgres:<PASSWORD>@db.<project-id>.supabase.co:5432/postgres?schema=public&sslmode=require
```

**Important:**
- Use the **direct connection** (port 5432), not the pooler
- Include `sslmode=require` in the URL
- URL encode special characters in password (see below)

### 2. URL Encode Password Special Characters

If your Supabase password contains special characters, encode them:

| Character | Encoded |
|-----------|---------|
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

**Example:**
- Password: `MyP@ssw0rd!`
- Encoded: `MyP%40ssw0rd%21`
- Full URL: `postgresql://postgres:MyP%40ssw0rd%21@db.xxx.supabase.co:5432/postgres?schema=public&sslmode=require`

### 3. Verify Build Command

The build command in `render.yaml` should be:
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

This ensures:
1. Dependencies are installed
2. Prisma Client is generated
3. Migrations are applied (uses DIRECT_URL)
4. Next.js build runs

### 4. Verify Prisma Schema

Your `prisma/schema.prisma` should have:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Verification Steps

1. **Check Render Environment Variables:**
   - [ ] `DATABASE_URL` is set with `sslmode=require`
   - [ ] `DIRECT_URL` is set with `sslmode=require`
   - [ ] Both URLs are identical (for Supabase)
   - [ ] Password is URL encoded if it contains special characters

2. **Test Connection Locally:**
   ```bash
   # Test DATABASE_URL
   npx prisma db pull
   
   # Test DIRECT_URL (for migrations)
   npx prisma migrate status
   ```

3. **Check Render Build Logs:**
   - Look for: `✅ Applied migration: <name>`
   - Should NOT see: `P1001: Can't reach database server`

## Common Issues

### Issue: "DIRECT_URL not set"
**Fix:** Set `DIRECT_URL` in Render environment variables to the same value as `DATABASE_URL`.

### Issue: "Connection refused"
**Fix:** 
- Verify Supabase project is not paused
- Check IPv4 compatibility is enabled in Supabase
- Ensure using direct connection (port 5432), not pooler (port 6543)
- Verify `sslmode=require` is in the URL

### Issue: "Authentication failed"
**Fix:**
- Check password is correct
- URL encode special characters in password
- Verify username is `postgres` (Supabase default)

### Issue: "Migrations already applied"
**Fix:** This is normal if migrations are up to date. The build will continue successfully.

## Why This Works

- **DATABASE_URL**: Used by Prisma Client at runtime (can use connection pooler)
- **DIRECT_URL**: Used by Prisma Migrate during build (must use direct connection, port 5432)
- **sslmode=require**: Supabase requires SSL/TLS for all connections
- **URL encoding**: PostgreSQL connection strings require URL-encoded passwords

## References

- [Prisma Direct URL](https://www.prisma.io/docs/concepts/components/prisma-schema/data-sources#direct-url)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PostgreSQL Connection String Format](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

