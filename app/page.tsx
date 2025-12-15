import Link from "next/link";

const navigation = [
  { name: "Functies", href: "#features" },
  { name: "Agents", href: "/agents" },
  { name: "Prijzen", href: "#pricing" },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Announcement bar */}
      <div className="bg-violet-50 border-b border-violet-100 text-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-gray-700">
            <span className="font-semibold text-violet-700">NIEUW —</span> AgentHub is live. Activeer
            AI-agents voor je bedrijf.
          </p>
          <Link
            href="/auth/login"
            className="text-violet-700 font-medium hover:text-violet-900 whitespace-nowrap"
          >
            Inloggen &rarr;
          </Link>
        </div>
      </div>

      {/* Header / navigation */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
              AgentHub
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="hover:text-gray-900 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
            >
              Inloggen
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Registreren
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {/* Hero section */}
        <section className="py-12 md:py-20">
          <div className="max-w-6xl mx-auto px-4 grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
                Activeer AI-agents voor je bedrijf. Zonder complexiteit.
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                AgentHub helpt MKB-bedrijven om AI-agents te activeren, runnen en beheren vanuit één
                dashboard. Praktisch, overzichtelijk en gemaakt voor kleine teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/register"
                  className="px-6 py-3 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-center transition-colors"
                >
                  Gratis account aanmaken
                </Link>
                <Link
                  href="/auth/login"
                  className="px-6 py-3 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-center transition-colors"
                >
                  Inloggen
                </Link>
              </div>
            </div>

            {/* Product preview mock */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900">AgentHub overzicht</h2>
                <span className="text-xs text-gray-500">Live demo</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Actieve agents
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">5</p>
                  <p className="text-xs text-gray-500 mt-1">Inbox, Sales, Marketing, Data</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Recente runs
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">128</p>
                  <p className="text-xs text-gray-500 mt-1">Laatste 24 uur</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Inzichten
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">12</p>
                  <p className="text-xs text-gray-500 mt-1">Actieve aanbevelingen</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Laatste activiteit</span>
                  <span>Inbox AI-agent • 2 min geleden</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-2/3 bg-violet-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vertrouwen / betrouwbaarheid strip */}
        <section className="py-10 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Veilige authenticatie",
                description: "Gebouwd op bewezen standaarden met versleutelde sessies.",
              },
              {
                title: "Modulaire AI-agents",
                description: "Activeer alleen de agents die jij nodig hebt voor je processen.",
              },
              {
                title: "Gebouwd voor kleine teams",
                description: "Geen data science team nodig. Start in een middag.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hoe het werkt */}
        <section id="features" className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Hoe het werkt</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "Stap 1",
                  title: "Account aanmaken",
                  description: "Maak een gratis account aan en log in op je AgentHub dashboard.",
                },
                {
                  step: "Stap 2",
                  title: "Agents activeren",
                  description: "Kies AI-agents uit de catalogus en stel ze in voor jouw use-cases.",
                },
                {
                  step: "Stap 3",
                  title: "Resultaten bekijken",
                  description: "Volg runs, inzichten en resultaten vanuit één centrale plek.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-100 bg-white p-5 flex flex-col gap-2"
                >
                  <span className="text-xs font-medium text-violet-600 uppercase tracking-wide">
                    {item.step}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature teaser */}
        <section id="pricing" className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Wat je krijgt met AgentHub</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Agent catalogus",
                  description: "Kies en activeer AI-agents per use-case, van inbox tot lead scoring.",
                },
                {
                  title: "Runs & logs",
                  description: "Volledig inzicht in elke agent-run, inclusief status en samenvatting.",
                },
                {
                  title: "Data Hub (binnenkort)",
                  description: "Alle data en context op één plek om agents slimmer te maken.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-100 bg-white p-5 flex flex-col gap-2"
                >
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call-to-action onderaan */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 bg-violet-50 border border-violet-100 rounded-2xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Klaar om AI praktisch in te zetten?
              </h2>
              <p className="mt-2 text-sm text-gray-700">
                Start met een gratis account en activeer je eerste agent in enkele minuten.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/register"
                className="px-6 py-3 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-center transition-colors"
              >
                Gratis registreren
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-3 text-sm font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-100 text-center transition-colors"
              >
                Inloggen
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>© {year} AgentHub</span>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:text-gray-700">
              Inloggen
            </Link>
            <Link href="/auth/register" className="hover:text-gray-700">
              Registreren
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}






