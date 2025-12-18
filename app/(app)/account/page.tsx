import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/bureauai/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  return (
    <AppShell
      title="Account"
      description="Beheer je accountinstellingen en personalisatie"
    >
      <div className="space-y-6">
        {/* Account info */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Accountgegevens
            </h2>
            {session && (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-zinc-600">Naam</p>
                  <p className="text-base text-zinc-900">{session.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Email</p>
                  <p className="text-base text-zinc-900">{session.user.email}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Personalization */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-2">
                Personalisatie
              </h2>
              <p className="text-sm text-zinc-600">
                Vul je profiel in om betere, gepersonaliseerde content te
                genereren. Je kunt je antwoorden altijd aanpassen.
              </p>
            </div>
            <Link href="/account/personalization">
              <Button variant="primary">Profiel invullen / bewerken</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}






