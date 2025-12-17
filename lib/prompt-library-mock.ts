import type { Prompt } from "./prompt-library";

export const mockPrompts: Prompt[] = [
  {
    id: "customer-support-triage",
    title: "Customer Support Triage Assistant",
    shortDescription: "Triage and summarize incoming customer support messages clearly.",
    category: "Customer Support",
    useCases: ["Support triage", "Inbox summarization"],
    level: "Intermediate",
    fullPrompt:
      "You are an AI assistant helping a customer support team triage incoming messages. For each message, identify the main issue, priority (low/medium/high), and suggested next action. Respond in concise bullet points.",
    explanation: {
      sections: [
        {
          title: "What does this prompt do?",
          body: "This prompt helps support teams quickly understand the core of each customer message, assign a simple priority, and propose a next action so that agents can respond faster and more consistently.",
        },
        {
          title: "When should you use this prompt?",
          body: "Use this prompt when you receive many unstructured emails or chat messages and need a first pass triage before routing tickets to the right person or queue.",
        },
        {
          title: "How to use this prompt",
          body: "1) Paste the full customer message. 2) Ask the model to identify the main issue, priority, and suggested next action. 3) Optionally, ask it to keep answers under 3 concise bullet points. 4) Use the output to decide routing and response strategy.",
        },
        {
          title: "Common mistakes",
          body: "Teams sometimes treat the triage output as a final answer instead of a helper. Always have a human quickly review high-priority or sensitive cases before sending a reply.",
        },
        {
          title: "Disclaimer",
          body: "This prompt does not replace human review for urgent, legal, or safety-critical customer issues.",
        },
      ],
    },
  },
  {
    id: "doc-anti-hallucinatie",
    title: "Documentanalyse – Anti-hallucinatie",
    shortDescription: "Analyseer documenten zonder aannames of verzonnen conclusies.",
    category: "Documents",
    useCases: ["Analyseren", "Hallucinaties verminderen"],
    level: "Beginner",
    fullPrompt: `Je bent een document-analist.

Regels:
- Gebruik UITSLUITEND informatie die letterlijk in het geüploade document staat.
- Voor elke conclusie of bewering:
  - citeer de exacte passage
  - vermeld het paginanummer of de sectie
- Als het antwoord niet in het document staat, zeg exact:
  "Dit staat niet in het document."
- Gebruik geen externe kennis.
- Maak geen aannames en vul geen gaten op.
- Is de vraag onduidelijk? Stel maximaal 1 verduidelijkende vraag.

Output-structuur:
1) Antwoord (max. 3–5 zinnen)
2) Bewijs (bullets met quote + pagina/sectie)
3) Onzekerheden of ontbrekende informatie (bullets)`,
    explanation: {
      sections: [
        {
          title: "What does this prompt do?",
          body: "Dwingt het model om uitsluitend bron-gebaseerde antwoorden te geven op basis van het geüploade document, met expliciete citaten en verwijzingen naar pagina’s of secties.",
        },
        {
          title: "When should you use this prompt?",
          body: "Gebruik deze prompt bij PDF’s, boeken, contracten of rapporten waar nauwkeurigheid en bronverwijzing cruciaal zijn.",
        },
        {
          title: "How to use this prompt",
          body: "1) Upload het document. 2) Plak deze prompt. 3) Stel je vraag. 4) Controleer of de gegeven citaten en verwijzingen echt in het document staan.",
        },
        {
          title: "Common mistakes",
          body: "Een veelgemaakte fout is de vraag stellen voordat de prompt is geplakt, waardoor het model toch gaat hallucineren of zonder citaten antwoordt.",
        },
        {
          title: "Disclaimer",
          body: "AI kan fouten maken. Controleer kritische of juridische informatie altijd zelf in het originele document.",
        },
      ],
    },
  },
  {
    id: "doc-executive-summary",
    title: "Documentsamenvatting – Executive Summary",
    shortDescription: "Maak een korte, zakelijke samenvatting van een document.",
    category: "Documents",
    useCases: ["Samenvatten", "Structureren"],
    level: "Beginner",
    fullPrompt: `Maak een executive summary van het geüploade document.

Regels:
- Gebruik alleen informatie die letterlijk in het document staat.
- Houd het beknopt en scanbaar.
- Voeg geen interpretaties toe die niet expliciet worden genoemd.

Structuur:
- Samenvatting in 5 bullets (max. 12 woorden per bullet)
- Belangrijke begrippen / definities (max. 8)
- Genoemde beslissingen of aanbevelingen (bullets)
- Risico’s of open vragen die het document noemt
- Actiepunten (wie / wat / wanneer), of zeg: "Niet gespecificeerd"`,
    explanation: {
      sections: [
        {
          title: "What does this prompt do?",
          body: "Zet lange documenten om in een korte, zakelijke managementsamenvatting die makkelijk te scannen is.",
        },
        {
          title: "When should you use this prompt?",
          body: "Gebruik deze prompt wanneer je snel overzicht wilt over een document zonder alle details te hoeven lezen.",
        },
        {
          title: "How to use this prompt",
          body: "Upload het document, plak deze prompt en lees vervolgens de gegenereerde bullets en lijsten als executive summary.",
        },
        {
          title: "Disclaimer",
          body: "Controleer belangrijke beslissingen en risico’s altijd in het originele document voordat je actie onderneemt.",
        },
      ],
    },
  },
  {
    id: "thinking-claim-check",
    title: "Claim-check – Aannames & Zwakke Plekken",
    shortDescription: "Ontleed claims op aannames, ontbrekende data en risico’s.",
    category: "Thinking",
    useCases: ["Aannames checken", "Analyseren"],
    level: "Intermediate",
    fullPrompt: `Je bent een kritische denker.

Ik geef je een claim, plan of overtuiging.
Jouw taak is om deze kritisch te ontleden.

Regels:
- Wees scherp en concreet, niet vaag of beleefd.
- Ga uit van logisch redeneren.
- Vermijd motivatiepraat.

Output:
1) De claim herschreven in één zin
2) Verborgen aannames (bullets)
3) Wat zou deze claim onderuit halen? (bullets)
4) Welke data of bewijs ontbreekt? (bullets)
5) Een sterkere, beter onderbouwde versie van de claim (1–3 zinnen)`,
    explanation: {
      sections: [
        {
          title: "What does this prompt do?",
          body: "Legt denkfouten, aannames en zwakke plekken in claims, plannen en overtuigingen bloot.",
        },
        {
          title: "When should you use this prompt?",
          body: "Gebruik deze prompt bij strategieën, plannen of sterke overtuigingen die je kritisch wilt toetsen voordat je ernaar handelt.",
        },
        {
          title: "Disclaimer",
          body: "Gebruik dit als denkhulp en startpunt voor discussie, niet als definitief oordeel over een plan of strategie.",
        },
      ],
    },
  },
];


