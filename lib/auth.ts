import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * NextAuth configuratie met Credentials provider
 * In stap 2 wordt dit verder uitgewerkt met login/register logica
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Missing credentials");
            return null;
          }

          console.log("[AUTH] Attempting login for:", credentials.email);

          // Zoek user op basis van email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log("[AUTH] User not found:", credentials.email);
            return null;
          }

          console.log("[AUTH] User found, verifying password...");

          // Verifieer wachtwoord
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isValid) {
            console.log("[AUTH] Invalid password for user:", credentials.email);
            return null;
          }

          console.log("[AUTH] Login successful for:", credentials.email);

          // Return user object voor sessie
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("[AUTH] Authorize error:", error);
          if (error instanceof Error) {
            console.error("[AUTH] Error message:", error.message);
            console.error("[AUTH] Error stack:", error.stack);
          }
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

