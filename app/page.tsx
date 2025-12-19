import Link from "next/link";

const navigation = [
  { name: "Hoe het werkt", href: "#features" },
  { name: "Agents", href: "/agents" },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* Announcement bar */}
      <div className="bg-zinc-50 border-b border-zinc-200 text-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-zinc-700">
            <span className="font-semibold text-zinc-900">NIEUW —</span> Bureau-AI is live. Activeer
            AI-agents voor je bedrijf.
          </p>
          <Link
            href="/auth/login"
            className="text-zinc-900 font-medium hover:text-zinc-700 whitespace-nowrap"
          >
            Inloggen &rarr;
          </Link>
        </div>
      </div>

      {/* Header / navigation */}
      <header className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900">
              Bureau-AI
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-600">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="hover:text-zinc-900 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Inloggen
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900">
                Je AI marketing specialist. In één dashboard.
              </h1>
              <p className="text-base sm:text-lg text-zinc-600">
                Maak betere marketingkeuzes op basis van je eigen data — zonder marketingteam.
              </p>
              <p className="text-sm text-zinc-600">
                Bureau-AI helpt kleine teams slimmere marketingbeslissingen te maken met AI-agents die analyseren, adviseren en helpen content te creëren. Geen drukke dashboards; duidelijke inzichten en acties.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/register"
                  className="px-6 py-3 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-center transition-colors"
                >
                  Gratis account aanmaken
                </Link>
                <Link
                  href="/auth/login"
                  className="px-6 py-3 text-sm font-medium rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-center transition-colors"
                >
                  Inloggen
                </Link>
              </div>
              <div className="pt-4 space-y-2 text-sm text-zinc-600">
                <p>✔ Ontworpen voor MKB en solo-teams</p>
                <p>✔ Geen marketingkennis of AI-ervaring nodig</p>
                <p>✔ Alles AI-first, zonder complexiteit</p>
              </div>
            </div>

            {/* Product preview mock */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900">Eén overzicht. Alle marketingcontext.</h2>
                <span className="text-xs text-zinc-500">Live demo</span>
              </div>
              <p className="text-xs text-zinc-600">
                Combineert LinkedIn content + ads + resultaten en geeft acties, niet alleen cijfers.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                    LinkedIn posts
                  </p>
                  <p className="text-2xl font-semibold text-zinc-900">24</p>
                  <p className="text-xs text-zinc-500 mt-1">Deze maand</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                    Ad campagnes
                  </p>
                  <p className="text-2xl font-semibold text-zinc-900">8</p>
                  <p className="text-xs text-zinc-500 mt-1">Actief</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                    Aanbevelingen
                  </p>
                  <p className="text-2xl font-semibold text-zinc-900">5</p>
                  <p className="text-xs text-zinc-500 mt-1">Nieuwe acties</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Laatste inzicht</span>
                  <span>Marketing Agent • 2 min geleden</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full w-2/3 bg-zinc-900 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Agents section */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">AI-agents met een duidelijke rol</h2>
            <p className="text-sm text-zinc-600 mb-8">
              Elke agent heeft één taak: jou helpen betere marketingbeslissingen te maken.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Marketing Agent",
                  description: "Analyseert campagnes, content en prestaties en geeft strategische aanbevelingen.",
                },
                {
                  title: "Content Agent",
                  description: "Helpt LinkedIn posts + blogs sneller te schrijven in jouw toon en stijl.",
                },
                {
                  title: "Data Agent",
                  description: "Verbindt ads/content/channel data en legt veranderingen in resultaten uit. (binnenkort)",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col gap-2"
                >
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-600">{item.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-zinc-600 text-center">
              Activeer alleen wat je nodig hebt.
            </p>
          </div>
        </section>

        {/* Hoe het werkt */}
        <section id="features" className="py-12 md:py-16 bg-zinc-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Hoe het werkt</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "Stap 1",
                  title: "Account aanmaken",
                  description: "Maak een gratis account aan en log in op je Bureau-AI dashboard.",
                },
                {
                  step: "Stap 2",
                  title: "Agents activeren",
                  description: "Verbind LinkedIn/content/campagne data en activeer de agents die je nodig hebt.",
                },
                {
                  step: "Stap 3",
                  title: "Beslissingen nemen",
                  description: "Krijg inzichten, aanbevelingen en volgende stappen om betere marketingkeuzes te maken.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col gap-2"
                >
                  <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
                    {item.step}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Bureau-AI */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Waarom ondernemers voor Bureau-AI kiezen</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">✗ Geen losse tools of dashboards</p>
                <p className="text-sm text-zinc-600">✗ Geen marketingbureau nodig</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">✗ Geen complexe setup</p>
                <p className="text-sm text-zinc-600">✗ Geen tijdverlies</p>
              </div>
            </div>
            <div className="mt-6 p-5 rounded-2xl border border-zinc-200 bg-zinc-50">
              <p className="text-sm font-medium text-zinc-900">
                Wel: focus, overzicht, betere beslissingen, meer tijd voor je bedrijf.
              </p>
            </div>
          </div>
        </section>

        {/* Support section */}
        <section className="py-12 bg-zinc-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">AI waar het kan. Mens waar het nodig is.</h2>
            <p className="text-sm text-zinc-600">
              De meeste vragen worden direct opgepakt door AI-support. Kom je er niet uit? Dan is er altijd een mens beschikbaar.
            </p>
          </div>
        </section>

        {/* Call-to-action onderaan */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-zinc-900">
                Klaar om je marketing slimmer aan te pakken?
              </h2>
              <p className="mt-2 text-sm text-zinc-700">
                Activeer je eerste AI-agent en ervaar hoe het is om met een AI marketing specialist te werken.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/register"
                className="px-6 py-3 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-center transition-colors"
              >
                Gratis account aanmaken
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-3 text-sm font-medium rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-center transition-colors"
              >
                Inloggen
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-500">
          <span>© {year} Bureau-AI</span>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:text-zinc-700">
              Inloggen
            </Link>
            <Link href="/auth/register" className="hover:text-zinc-700">
              Registreren
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
