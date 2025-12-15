/**
 * Test script om te controleren of een gebruiker bestaat en het wachtwoord correct is
 * Run met: npx tsx scripts/test-login.ts <email>
 */

import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const email = process.argv[2];

if (!email) {
  console.log("Usage: npx tsx scripts/test-login.ts <email>");
  process.exit(1);
}

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ Gebruiker met email ${email} niet gevonden`);
      return;
    }

    console.log(`✅ Gebruiker gevonden:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Naam: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   PasswordHash: ${user.passwordHash.substring(0, 20)}...`);
    console.log(`   Created: ${user.createdAt}`);

    // Test wachtwoord (vraag om input)
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question("Voer het wachtwoord in om te testen: ", async (password: string) => {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      console.log(`\nWachtwoord verificatie: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
      readline.close();
      await prisma.$disconnect();
    });
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testLogin();

