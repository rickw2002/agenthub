# Data Hub Provider Enum Audit

**Date:** 2024-12-19  
**Purpose:** Confirm exact provider strings used end-to-end

---

## A) Current Provider Strings Found

### Constants Arrays (6 files)

1. **`app/api/data/connect/route.ts` (line 6)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

2. **`app/api/data/disconnect/route.ts` (line 6)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

3. **`app/api/data/overview/route.ts` (line 8)**
   ```typescript
   const PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

4. **`app/api/data/channel/route.ts` (line 8)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

5. **`app/(app)/data/page.tsx` (line 8)**
   ```typescript
   const PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

6. **`app/(app)/data/[provider]/page.tsx` (line 8)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

### Chat Scopes

7. **`app/api/chat/route.ts` (line 7-15)**
   ```typescript
   const VALID_SCOPES = [
     "MASTER",
     "GOOGLE_ADS",
     "META_ADS",
     "LINKEDIN",
     "WEBSITE",
     "EMAIL",
     "SUPPORT",
   ] as const;
   ```

### Prisma Schema Comments

8. **`prisma/schema.prisma` (lines 98, 101, 108, 128, 147, 168)**
   - Comments list: `GOOGLE_ADS | META_ADS | LINKEDIN | WEBSITE | EMAIL | SUPPORT`
   - No enum type (uses `String`)

### Display Name Mappings (2 files)

9. **`components/ChannelCard.tsx` (line 38-48)**
   ```typescript
   function getProviderDisplayName(provider: string): string {
     const names: Record<string, string> = {
       GOOGLE_ADS: "Google Ads",
       META_ADS: "Meta Ads",
       LINKEDIN: "LinkedIn",
       WEBSITE: "Website",
       EMAIL: "Email",
       SUPPORT: "Support",
     };
     return names[provider] || provider;
   }
   ```

10. **`components/ChannelDetailContent.tsx` (line 47-57)**
    ```typescript
    function getProviderDisplayName(provider: string): string {
      const names: Record<string, string> = {
        GOOGLE_ADS: "Google Ads",
        META_ADS: "Meta Ads",
        LINKEDIN: "LinkedIn",
        WEBSITE: "Website",
        EMAIL: "Email",
        SUPPORT: "Support",
      };
      return names[provider] || provider;
    }
    ```

### Slug Mapping

11. **`app/(app)/data/[provider]/page.tsx` (line 10-17)**
    ```typescript
    function slugToProvider(slug: string): string | null {
      // Convert "google_ads" or "google-ads" to "GOOGLE_ADS"
      const upperSlug = slug.toUpperCase().replace(/-/g, "_");
      if (VALID_PROVIDERS.includes(upperSlug as any)) {
        return upperSlug;
      }
      return null;
    }
    ```

12. **`components/ChannelCard.tsx` (line 74-76)**
    ```typescript
    function providerToSlug(provider: string): string {
      return provider.toLowerCase().replace(/_/g, "_");
    }
    ```
    **Note:** This function has a bug - it replaces `_` with `_` (no change). Should be:
    ```typescript
    return provider.toLowerCase().replace(/_/g, "-");  // or keep "_"
    ```

---

## B) Recommended Exact Enum Strings

**Canonical provider set:**
```typescript
const PROVIDERS = [
  "GOOGLE_ADS",        // Google Ads (paid ads)
  "GOOGLE_ANALYTICS",  // Google Analytics 4 (web analytics) - NEW
  "META_ADS",          // Meta Ads (Facebook/Instagram ads)
  "EMAIL_MARKETING",   // Email marketing (Mailchimp/Klaviyo) - NEW
  "LINKEDIN_ORGANIC",  // LinkedIn organic posts - NEW (rename from LINKEDIN)
  "WEBSITE",           // Website (existing)
  "EMAIL",             // Email (existing, keep for now)
  "SUPPORT",           // Support (existing)
] as const;
```

**For Phase 1 (GA4 only):**
```typescript
const PROVIDERS = [
  "GOOGLE_ADS",
  "GOOGLE_ANALYTICS",  // ADD THIS
  "META_ADS",
  "LINKEDIN",          // Keep existing name for now
  "WEBSITE",
  "EMAIL",
  "SUPPORT",
] as const;
```

**Rationale:**
- `GOOGLE_ANALYTICS` - Clear distinction from `GOOGLE_ADS`
- `EMAIL_MARKETING` - Clear distinction from generic `EMAIL` (if needed later)
- `LINKEDIN_ORGANIC` - Clear distinction from LinkedIn Ads (future)

**Decision:** For MVP, add only `GOOGLE_ANALYTICS`. Keep `LINKEDIN` as-is (can rename later if needed).

---

## C) Exact Files/Lines to Edit

### Add `GOOGLE_ANALYTICS` to constants (6 files):

1. **`app/api/data/connect/route.ts` (line 6)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

2. **`app/api/data/disconnect/route.ts` (line 6)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

3. **`app/api/data/overview/route.ts` (line 8)**
   ```typescript
   const PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

4. **`app/api/data/channel/route.ts` (line 8)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

5. **`app/(app)/data/page.tsx` (line 8)**
   ```typescript
   const PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

6. **`app/(app)/data/[provider]/page.tsx` (line 8)**
   ```typescript
   const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
   ```

### Add `GOOGLE_ANALYTICS` to chat scopes (1 file):

7. **`app/api/chat/route.ts` (line 7-15)**
   ```typescript
   const VALID_SCOPES = [
     "MASTER",
     "GOOGLE_ADS",
     "GOOGLE_ANALYTICS",  // ADD THIS
     "META_ADS",
     "LINKEDIN",
     "WEBSITE",
     "EMAIL",
     "SUPPORT",
   ] as const;
   ```

### Add display name mappings (2 files):

8. **`components/ChannelCard.tsx` (line 38-48)**
   ```typescript
   function getProviderDisplayName(provider: string): string {
     const names: Record<string, string> = {
       GOOGLE_ADS: "Google Ads",
       GOOGLE_ANALYTICS: "Google Analytics",  // ADD THIS
       META_ADS: "Meta Ads",
       LINKEDIN: "LinkedIn",
       WEBSITE: "Website",
       EMAIL: "Email",
       SUPPORT: "Support",
     };
     return names[provider] || provider;
   }
   ```

9. **`components/ChannelDetailContent.tsx` (line 47-57)**
   ```typescript
   function getProviderDisplayName(provider: string): string {
     const names: Record<string, string> = {
       GOOGLE_ADS: "Google Ads",
       GOOGLE_ANALYTICS: "Google Analytics",  // ADD THIS
       META_ADS: "Meta Ads",
       LINKEDIN: "LinkedIn",
       WEBSITE: "Website",
       EMAIL: "Email",
       SUPPORT: "Support",
     };
     return names[provider] || provider;
   }
   ```

### Update Prisma schema comment (1 file):

10. **`prisma/schema.prisma` (line 108)**
    ```prisma
    provider    String   // GOOGLE_ADS | GOOGLE_ANALYTICS | META_ADS | LINKEDIN | WEBSITE | EMAIL | SUPPORT
    ```
    (Also update lines 128, 147, 168 for consistency)

---

## D) Slug Mapping Support

### `slugToProvider` function (in `app/(app)/data/[provider]/page.tsx`)

**Current implementation (line 10-17):**
```typescript
function slugToProvider(slug: string): string | null {
  // Convert "google_ads" or "google-ads" to "GOOGLE_ADS"
  const upperSlug = slug.toUpperCase().replace(/-/g, "_");
  if (VALID_PROVIDERS.includes(upperSlug as any)) {
    return upperSlug;
  }
  return null;
}
```

**Support for `GOOGLE_ANALYTICS`:**
- ✅ **YES** - Already supports it
- Input: `google_analytics` or `google-analytics`
- Process: `upperSlug = "GOOGLE_ANALYTICS"`
- Check: `VALID_PROVIDERS.includes("GOOGLE_ANALYTICS")` → ✅ (after adding to array)

**Test cases:**
- `/data/google_analytics` → `GOOGLE_ANALYTICS` ✅
- `/data/google-analytics` → `GOOGLE_ANALYTICS` ✅
- `/data/googleads` → `null` (not in enum) ✅

### `providerToSlug` function (in `components/ChannelCard.tsx`)

**Current implementation (line 74-76):**
```typescript
function providerToSlug(provider: string): string {
  return provider.toLowerCase().replace(/_/g, "_");
}
```

**Issue:** Replaces `_` with `_` (no change). Should be:
```typescript
function providerToSlug(provider: string): string {
  return provider.toLowerCase().replace(/_/g, "-");  // Use hyphens for URLs
}
```

**Support for `GOOGLE_ANALYTICS`:**
- ✅ **YES** - Will work after fix
- Input: `GOOGLE_ANALYTICS`
- Output: `google-analytics` (after fix) or `google_analytics` (current, also works)

**Recommendation:** Fix the function to use hyphens (cleaner URLs), but current implementation also works.

---

## E) Summary

### Current State
- **6 constants arrays** with identical values: `["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"]`
- **1 chat scopes array** with same values + `"MASTER"`
- **2 display name mappings** (identical in ChannelCard and ChannelDetailContent)
- **1 slug converter** (`slugToProvider`) - supports any uppercase string with `_` or `-`
- **1 provider-to-slug converter** (`providerToSlug`) - has minor bug (replaces `_` with `_`)

### Recommended Provider Strings

**Phase 1 (GA4):**
1. `GOOGLE_ANALYTICS` - Google Analytics 4

**Phase 2 (Meta Ads):**
2. `META_ADS` - Meta Ads (already exists)

**Phase 3 (Email Marketing):**
3. `EMAIL_MARKETING` - Email marketing platforms (or keep `EMAIL` if sufficient)

**Phase 4 (LinkedIn Organic):**
4. `LINKEDIN_ORGANIC` - LinkedIn organic posts (or keep `LINKEDIN` if sufficient)

**Decision for MVP:** Add only `GOOGLE_ANALYTICS`. Keep others as-is.

### Files to Edit (10 total)

**Constants (6 files):**
- `app/api/data/connect/route.ts` (line 6)
- `app/api/data/disconnect/route.ts` (line 6)
- `app/api/data/overview/route.ts` (line 8)
- `app/api/data/channel/route.ts` (line 8)
- `app/(app)/data/page.tsx` (line 8)
- `app/(app)/data/[provider]/page.tsx` (line 8)

**Chat scopes (1 file):**
- `app/api/chat/route.ts` (line 7-15)

**Display names (2 files):**
- `components/ChannelCard.tsx` (line 38-48)
- `components/ChannelDetailContent.tsx` (line 47-57)

**Schema comments (1 file):**
- `prisma/schema.prisma` (lines 108, 128, 147, 168)

### Slug Support

- ✅ **`slugToProvider` supports `GOOGLE_ANALYTICS`** - Works after adding to `VALID_PROVIDERS`
- ⚠️ **`providerToSlug` has minor bug** - Fix recommended (use hyphens), but current works

---

**Status:** ✅ **Audit complete - 10 files to edit, slug mapping already supports new providers**

