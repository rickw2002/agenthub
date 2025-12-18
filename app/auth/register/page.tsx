"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validatie
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }

    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens lang zijn");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan bij de registratie");
        setLoading(false);
        return;
      }

      // Redirect naar login na succesvolle registratie
      router.push("/auth/login?registered=true");
    } catch (error) {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Registreren</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Naam"
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Jouw naam"
        />

        <Input
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="jouw@email.nl"
        />

        <div>
          <Input
            label="Wachtwoord"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-zinc-500">Minimaal 6 tekens</p>
        </div>

        <Input
          label="Bevestig wachtwoord"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          placeholder="••••••••"
        />

        <Button
          type="submit"
          disabled={loading}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {loading ? "Registreren..." : "Registreren"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Al een account?{" "}
        <Link href="/auth/login" className="text-zinc-900 hover:underline font-medium">
          Log hier in
        </Link>
      </p>
    </Card>
  );
}
