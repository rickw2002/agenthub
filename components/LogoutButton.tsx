"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="text-sm text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors"
    >
      Uitloggen
    </button>
  );
}






