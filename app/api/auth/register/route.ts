import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * API route voor gebruikersregistratie
 * POST /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validatie
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, wachtwoord en naam zijn verplicht" },
        { status: 400 }
      );
    }

    // Check of user al bestaat
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Dit emailadres is al geregistreerd" },
        { status: 400 }
      );
    }

    // Hash wachtwoord
    const passwordHash = await bcrypt.hash(password, 10);

    // Maak nieuwe user aan
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    return NextResponse.json(
      { message: "Registratie succesvol", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registratie error:", error);
    
    // Geef meer details in development
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    const errorDetails = process.env.NODE_ENV === "development" 
      ? { error: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      : { error: "Er is iets misgegaan bij de registratie" };
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}

