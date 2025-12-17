-- AlterTable
ALTER TABLE "AgentTemplate" ADD COLUMN     "executor" TEXT NOT NULL DEFAULT 'n8n',
ADD COLUMN     "n8nWebhookPath" TEXT,
ADD COLUMN     "n8nWorkflowId" TEXT;

-- AlterTable
ALTER TABLE "RunLog" ADD COLUMN     "executor" TEXT NOT NULL DEFAULT 'n8n',
ADD COLUMN     "externalRunId" TEXT;
