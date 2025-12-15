-- Redefine RunLog for Postgres (add updatedAt, keep data)
CREATE TABLE "new_RunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAgentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "resultUrl" TEXT,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RunLog_userAgentId_fkey" FOREIGN KEY ("userAgentId") REFERENCES "UserAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_RunLog" ("createdAt", "id", "status", "summary", "userAgentId")
SELECT "createdAt", "id", "status", "summary", "userAgentId" FROM "RunLog";

DROP TABLE "RunLog";
ALTER TABLE "new_RunLog" RENAME TO "RunLog";
