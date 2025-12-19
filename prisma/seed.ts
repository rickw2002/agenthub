import { PrismaClient } from "@prisma/client";
import { getOrCreateWorkspace } from "@/lib/workspace";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // AI Virtual Assistant (Inbox)
  const inboxAssistant = await prisma.agentTemplate.upsert({
    where: { slug: "ai-virtual-assistant-inbox" },
    update: {},
    create: {
      name: "AI Virtual Assistant (Inbox)",
      slug: "ai-virtual-assistant-inbox",
      category: "Operations",
      shortDescription: "Automatiseer je inbox met een AI-assistent die e-mails categoriseert, prioriteert en beantwoordt.",
      longDescription: `De AI Virtual Assistant voor Inbox helpt je om je e-mailbeheer te automatiseren. Deze agent kan:

• E-mails automatisch categoriseren op basis van onderwerp en inhoud
• Belangrijke e-mails prioriteren en markeren
• Standaardantwoorden genereren voor veelvoorkomende vragen
• E-mails doorsturen naar de juiste persoon of afdeling
• Follow-ups plannen voor belangrijke conversaties

Perfect voor MKB-bedrijven die veel e-mailverkeer hebben en tijd willen besparen.`,
      type: "agent",
      difficulty: "beginner",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "emailAccount",
            label: "E-mail account",
            type: "email",
            required: true,
            description: "Het e-mailadres dat beheerd moet worden",
          },
          {
            name: "autoReply",
            label: "Automatisch antwoorden",
            type: "boolean",
            required: false,
            default: false,
          },
          {
            name: "priorityKeywords",
            label: "Prioriteit keywords",
            type: "text",
            required: false,
            description: "Komma-gescheiden lijst van keywords die prioriteit krijgen",
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  // LinkedIn Content Maker
  const linkedInContent = await prisma.agentTemplate.upsert({
    where: { slug: "linkedin-content-maker" },
    update: {},
    create: {
      name: "LinkedIn Content Maker",
      slug: "linkedin-content-maker",
      category: "Marketing",
      shortDescription: "Genereer automatisch professionele LinkedIn posts en artikelen voor je bedrijf.",
      longDescription: `De LinkedIn Content Maker helpt je om consistent en effectief content te creëren voor je LinkedIn-profiel of bedrijfspagina. Deze agent:

• Genereert LinkedIn posts op basis van je bedrijfsinformatie en doelen
• Creëert artikelen en long-form content
• Optimaliseert content voor LinkedIn's algoritme
• Plant posts op optimale tijden
• Analyseert engagement en past strategie aan

Ideaal voor MKB-bedrijven die hun online aanwezigheid willen versterken zonder dagelijks tijd te besteden aan content creatie.`,
      type: "agent",
      difficulty: "beginner",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "linkedInAccount",
            label: "LinkedIn account",
            type: "text",
            required: true,
            description: "Je LinkedIn profiel of bedrijfspagina URL",
          },
          {
            name: "contentTheme",
            label: "Content thema",
            type: "select",
            required: true,
            options: ["Industry insights", "Company updates", "Thought leadership", "Product highlights"],
          },
          {
            name: "postingFrequency",
            label: "Post frequentie",
            type: "select",
            required: true,
            options: ["Daily", "3x per week", "Weekly", "2x per week"],
          },
          {
            name: "targetAudience",
            label: "Doelgroep",
            type: "text",
            required: false,
            description: "Beschrijving van je doelgroep voor gepersonaliseerde content",
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  // PDF Scraper / Analyzer
  const pdfScraper = await prisma.agentTemplate.upsert({
    where: { slug: "pdf-scraper-analyzer" },
    update: {},
    create: {
      name: "PDF Scraper / Analyzer",
      slug: "pdf-scraper-analyzer",
      category: "Operations",
      shortDescription: "Extraheer en analyseer automatisch informatie uit PDF-documenten.",
      longDescription: `De PDF Scraper en Analyzer helpt je om grote hoeveelheden PDF-documenten snel te verwerken. Deze agent:

• Extraheert tekst, tabellen en afbeeldingen uit PDF's
• Analyseert documenten op specifieke informatie
• Categoriseert documenten automatisch
• Genereert samenvattingen van lange documenten
• Zoekt naar specifieke keywords of patronen
• Exporteert geëxtraheerde data naar verschillende formaten

Perfect voor bedrijven die regelmatig offertes, contracten, facturen of rapporten moeten verwerken.`,
      type: "workflow",
      difficulty: "advanced",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "sourceFolder",
            label: "Bron map",
            type: "text",
            required: true,
            description: "Pad naar de map met PDF bestanden",
          },
          {
            name: "extractionType",
            label: "Extractie type",
            type: "select",
            required: true,
            options: ["Full text", "Tables only", "Specific fields", "Summarize"],
          },
          {
            name: "outputFormat",
            label: "Output formaat",
            type: "select",
            required: true,
            options: ["CSV", "JSON", "Excel", "Text"],
          },
          {
            name: "keywords",
            label: "Zoek keywords (optioneel)",
            type: "text",
            required: false,
            description: "Komma-gescheiden lijst van keywords om te zoeken",
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  // Email Reply Helper
  const emailReply = await prisma.agentTemplate.upsert({
    where: { slug: "email-reply-helper" },
    update: {},
    create: {
      name: "Email Reply Helper",
      slug: "email-reply-helper",
      category: "Sales",
      shortDescription: "Krijg AI-gegenereerde antwoordsuggesties voor je e-mails, afgestemd op je communicatiestijl.",
      longDescription: `De Email Reply Helper analyseert inkomende e-mails en genereert gepersonaliseerde antwoordsuggesties. Deze agent:

• Analyseert de context en toon van inkomende e-mails
• Genereert professionele antwoordsuggesties
• Leert je communicatiestijl en past suggesties aan
• Houdt rekening met je agenda en beschikbaarheid
• Suggereert geschikte momenten om te reageren
• Biedt meerdere toonopties (formeel, vriendelijk, zakelijk)

Geschikt voor sales teams en accountmanagers die veel e-mailverkeer hebben en snel willen reageren.`,
      type: "agent",
      difficulty: "beginner",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "emailAccount",
            label: "E-mail account",
            type: "email",
            required: true,
          },
          {
            name: "communicationStyle",
            label: "Communicatiestijl",
            type: "select",
            required: true,
            options: ["Formeel", "Vriendelijk", "Zakelijk", "Casual"],
          },
          {
            name: "autoSuggest",
            label: "Automatische suggesties",
            type: "boolean",
            required: false,
            default: true,
            description: "Toon automatisch suggesties bij nieuwe e-mails",
          },
          {
            name: "responseTime",
            label: "Gewenste reactietijd",
            type: "select",
            required: false,
            options: ["Direct", "Binnen 1 uur", "Binnen 4 uur", "Binnen 24 uur"],
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  // Lead Research Agent
  const leadResearch = await prisma.agentTemplate.upsert({
    where: { slug: "lead-research-agent" },
    update: {},
    create: {
      name: "Lead Research Agent",
      slug: "lead-research-agent",
      category: "Sales",
      shortDescription: "Verzamel automatisch gedetailleerde informatie over potentiële leads en klanten.",
      longDescription: `De Lead Research Agent verzamelt en analyseert informatie over potentiële klanten. Deze agent:

• Zoekt online naar bedrijfsinformatie en nieuws
• Analyseert social media profielen en activiteit
• Verzamelt financiële data en bedrijfsstatistieken
• Identificeert decision makers en contactpersonen
• Genereert gedetailleerde lead profielen
• Biedt inzichten voor gepersonaliseerde benadering

Essentieel voor sales teams die tijd willen besparen bij lead qualification en voorbereiding van sales calls.`,
      type: "agent",
      difficulty: "advanced",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "dataSources",
            label: "Data bronnen",
            type: "multiselect",
            required: true,
            options: ["Company website", "LinkedIn", "News articles", "Financial data", "Social media"],
          },
          {
            name: "researchDepth",
            label: "Onderzoeksdiepte",
            type: "select",
            required: true,
            options: ["Basic", "Standard", "Comprehensive"],
          },
          {
            name: "outputFormat",
            label: "Output formaat",
            type: "select",
            required: true,
            options: ["Report", "CRM import", "Email summary"],
          },
          {
            name: "autoUpdate",
            label: "Automatische updates",
            type: "boolean",
            required: false,
            default: false,
            description: "Ontvang updates wanneer er nieuwe informatie beschikbaar is",
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  // Document Q&A (v1)
  const docQaV1 = await prisma.agentTemplate.upsert({
    where: { slug: "doc-qa-v1" },
    update: {},
    create: {
      name: "Document Q&A (v1)",
      slug: "doc-qa-v1",
      category: "Knowledge",
      shortDescription: "Stel vragen over je geüploade documenten met bronvermelding.",
      longDescription: `De Document Q&A agent geeft gegronde antwoorden op basis van je geüploade documenten. Deze agent:

• Beantwoordt vragen met directe citaties uit je documenten
• Gebruikt alleen informatie die daadwerkelijk in je documenten staat (geen hallucinaties)
• Toont precies welke documenten en pagina's als bron zijn gebruikt
• Geeft extra reasoning en context waar nodig
• Identificeert wanneer informatie ontbreekt en stelt verduidelijkende vragen

Elk antwoord bevat:
- Een direct antwoord met bronvermelding (citations)
- Extra reasoning met label wanneer aanvullende context wordt gegeven
- Vragen wanneer informatie ontbreekt

Perfect voor teams die snel informatie uit documenten, handleidingen, contracten of rapporten willen opzoeken.`,
      type: "agent",
      difficulty: "beginner",
      videoUrl: null,
      configSchema: JSON.stringify({
        fields: [
          {
            name: "mode",
            label: "Modus",
            type: "select",
            required: false,
            options: ["qa", "summary", "plan", "checklist"],
            description: "Kies de modus: qa (vragen beantwoorden), summary (samenvatten), plan (plan maken), checklist (checklist genereren)",
          },
          {
            name: "documentId",
            label: "Document ID",
            type: "text",
            required: false,
            description: "Optioneel: specifiek document ID om te doorzoeken. Laat leeg om alle documenten te doorzoeken.",
          },
        ],
      }),
      executor: "n8n",
      n8nWorkflowId: null,
      n8nWebhookPath: null,
    },
  });

  console.log("✅ Seeded agents:");
  console.log(`   - ${inboxAssistant.name}`);
  console.log(`   - ${linkedInContent.name}`);
  console.log(`   - ${pdfScraper.name}`);
  console.log(`   - ${emailReply.name}`);
  console.log(`   - ${leadResearch.name}`);
  console.log(`   - ${docQaV1.name}`);

  // Seed Data Hub data
  await seedDataHub();
}

async function seedDataHub() {
  console.log("🌱 Seeding Data Hub...");

  // Get first user (idempotent - use any existing user)
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.log("⚠️  No users found. Skipping Data Hub seeding.");
    console.log("   Create a user first (register via /auth/register).");
    return;
  }

  const userId = user.id;

  // Get or create workspace for this user (workspace-based tenancy)
  const workspace = await getOrCreateWorkspace(userId);
  const workspaceId = workspace.id;

  // Check if connections already exist (idempotent check)
  const existingConnections = await prisma.connection.findMany({
    where: { workspaceId },
  });

  if (existingConnections.length > 0) {
    console.log("✅ Data Hub already seeded. Skipping...");
    return;
  }

  // Create Connections
  const providers = [
    { provider: "GOOGLE_ADS", status: "CONNECTED" },
    { provider: "META_ADS", status: "CONNECTED" },
    { provider: "LINKEDIN", status: "CONNECTED" },
    { provider: "WEBSITE", status: "NOT_CONNECTED" },
    { provider: "EMAIL", status: "NOT_CONNECTED" },
    { provider: "SUPPORT", status: "NOT_CONNECTED" },
  ];

  for (const { provider, status } of providers) {
    await prisma.connection.create({
      data: {
        userId,
        workspaceId,
        provider,
        status,
        authJson: status === "CONNECTED" ? JSON.stringify({ connected: true, lastSync: new Date().toISOString() }) : null,
      },
    });
  }

  console.log("✅ Created 6 connections");

  // Create MetricDaily entries for last 30 days for connected providers
  const connectedProviders = ["GOOGLE_ADS", "META_ADS", "LINKEDIN"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const provider of connectedProviders) {
    const metricsArray = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Generate predictable seeded metrics
      const baseImpressions = provider === "GOOGLE_ADS" ? 5000 : provider === "META_ADS" ? 8000 : 3000;
      const baseClicks = provider === "GOOGLE_ADS" ? 150 : provider === "META_ADS" ? 200 : 80;
      const baseConversions = provider === "GOOGLE_ADS" ? 25 : provider === "META_ADS" ? 35 : 12;
      const baseSpend = provider === "GOOGLE_ADS" ? 250 : provider === "META_ADS" ? 400 : 150;

      // Add variation based on day (predictable seed)
      const dayVariation = (i % 7) * 0.1;
      const impressions = Math.round(baseImpressions * (1 + dayVariation));
      const clicks = Math.round(baseClicks * (1 + dayVariation * 0.5));
      const conversions = Math.round(baseConversions * (1 + dayVariation * 0.3));
      const spend = Math.round(baseSpend * (1 + dayVariation * 0.2));

      const metricsJson = JSON.stringify({
        impressions,
        clicks,
        conversions,
        spend,
        ctr: clicks / impressions,
        cpc: spend / clicks,
        conversionRate: conversions / clicks,
      });

      metricsArray.push({
        userId,
        workspaceId,
        provider,
        date,
        metricsJson,
        dimensionsJson: JSON.stringify({
          campaign: `Campaign ${provider}-${i % 3 + 1}`,
          device: i % 3 === 0 ? "mobile" : i % 3 === 1 ? "desktop" : "tablet",
        }),
      });
    }

    await prisma.metricDaily.createMany({
      data: metricsArray,
    });
  }

  console.log("✅ Created MetricDaily entries (30 days × 3 providers = 90 entries)");

  // Create Insights per provider
  const insightsData = [
    // Google Ads insights
    {
      provider: "GOOGLE_ADS",
      title: "High CTR on Search Campaign",
      summary: "Your search campaigns are performing above average with a CTR of 4.2% this week.",
      severity: "INFO",
      period: "7d",
    },
    {
      provider: "GOOGLE_ADS",
      title: "Conversion Rate Declining",
      summary: "Conversion rate dropped by 15% compared to last week. Consider reviewing landing pages.",
      severity: "WARNING",
      period: "7d",
    },
    {
      provider: "GOOGLE_ADS",
      title: "Budget Exceeded",
      summary: "Daily budget exceeded on 3 campaigns. Consider adjusting bids or increasing budget.",
      severity: "CRITICAL",
      period: "1d",
    },
    // Meta Ads insights
    {
      provider: "META_ADS",
      title: "Strong Performance on Video Ads",
      summary: "Video ad formats showing 2.5x higher engagement rates than image ads.",
      severity: "INFO",
      period: "7d",
    },
    {
      provider: "META_ADS",
      title: "CPC Increasing",
      summary: "Cost per click increased by 22% this week. Competition may be rising.",
      severity: "WARNING",
      period: "7d",
    },
    {
      provider: "META_ADS",
      title: "Low Relevance Score",
      summary: "Ad relevance score dropped below 5 on 2 campaigns. Review targeting and creative.",
      severity: "WARNING",
      period: "3d",
    },
    // LinkedIn insights
    {
      provider: "LINKEDIN",
      title: "B2B Campaign Performing Well",
      summary: "LinkedIn campaigns generating high-quality leads with 18% conversion rate.",
      severity: "INFO",
      period: "7d",
    },
    {
      provider: "LINKEDIN",
      title: "Limited Reach",
      summary: "Campaign reach is lower than expected. Consider expanding targeting criteria.",
      severity: "WARNING",
      period: "7d",
    },
    // Master insight
    {
      provider: null,
      title: "Cross-Channel Performance Summary",
      summary: "Overall performance is strong across all channels. Google Ads and Meta Ads driving most conversions.",
      severity: "INFO",
      period: "30d",
    },
  ];

  for (const insight of insightsData) {
    await prisma.insight.create({
      data: {
        userId,
        workspaceId,
        provider: insight.provider,
        title: insight.title,
        summary: insight.summary,
        severity: insight.severity,
        period: insight.period,
        dataRefJson: JSON.stringify({
          referencedProviders: insight.provider ? [insight.provider] : ["GOOGLE_ADS", "META_ADS", "LINKEDIN"],
        }),
      },
    });
  }

  console.log("✅ Created insights (9 total: 3 per provider + 1 master)");
  console.log("✅ Data Hub seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

