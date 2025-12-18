"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        setSuccess("Registratie succesvol! Je kunt nu inloggen.");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ongeldig emailadres of wachtwoord");
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Inloggen</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && (
          <div className="p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jouw@email.nl"
          />

        <Input
          label="Wachtwoord"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

        <Button
          type="submit"
          disabled={loading}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {loading ? "Inloggen..." : "Inloggen"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Nog geen account?{" "}
        <Link href="/auth/register" className="text-zinc-900 hover:underline font-medium">
          Registreer hier
        </Link>
      </p>
    </Card>
  );
}
