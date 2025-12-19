# Data Hub Tenancy – Workspace-based Model

De Data Hub (Connections, Metrics, Insights, Chat) is omgezet van `userId`-based naar **workspaceId-based** tenancy.

## Stappen voor rollout

1. **Migraties draaien**

```bash
# Dev
npx prisma migrate dev --name add_workspace_to_datahub_models
npx prisma migrate dev --name datahub_workspace_not_null

# Production/staging
npx prisma migrate deploy
```

2. **Backfill workspaceId voor bestaande data**

```bash
npm run datahub:backfill-workspace
```

3. **Controle: geen NULL workspaceId meer**

```bash
npm run datahub:check-workspace
```

Als een van de counts > 0 is, wordt met exit code ≠ 0 gestopt en moet je de backfill opnieuw bekijken.

4. **Deploy**

Na succesvolle migraties + checks kun je de Next.js app deployen. Alle Data Hub routes/pages gebruiken nu `workspaceId` als primary tenant key.

## Betrokken modellen

- `Connection` – nu met `workspaceId` (NOT NULL) + `workspace` relatie
- `MetricDaily` – nu met `workspaceId` (NOT NULL) + `workspace` relatie
- `Insight` – nu met `workspaceId` (NOT NULL) + `workspace` relatie
- `ChatMessage` – nu met `workspaceId` (NOT NULL) + `workspace` relatie

`userId` blijft voorlopig bestaan voor auditing en backwards compatibility, maar alle nieuwe queries/writes voor Data Hub zijn workspace-based.

## Rollback (dev)

Als er iets misgaat tijdens ontwikkeling:

- Gebruik `prisma migrate reset` (in dev) om de database te resetten.
- Of rollback de laatste migraties en draai de app opnieuw.

In productie: rollback gebeurt via database snapshots/backups en Git rollback van de codebase.


