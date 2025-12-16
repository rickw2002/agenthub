import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/organization";

/**
 * API route voor het activeren van een agent
 * POST /api/agents/activate
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { agentTemplateId, name, config } = body;

    // Validatie
    if (!agentTemplateId || !name) {
      return NextResponse.json(
        { error: "Agent template ID en naam zijn verplicht" },
        { status: 400 }
      );
    }

    // Check of agent template bestaat
    const agentTemplate = await prisma.agentTemplate.findUnique({
      where: { id: agentTemplateId },
    });

    if (!agentTemplate) {
      return NextResponse.json({ error: "Agent template niet gevonden" }, { status: 404 });
    }

    // TODO: UserAgent table doesn't have organizationId yet - needs to be added for proper org isolation
    const orgId = await getCurrentOrgId(session.user.id);

    // Maak UserAgent aan
    const userAgent = await prisma.userAgent.create({
      data: {
        userId: session.user.id,
        agentTemplateId,
        name,
        config: config || "{}",
        status: "active",
      },
    });

    return NextResponse.json(
      { message: "Agent succesvol geactiveerd", userAgentId: userAgent.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent activatie error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het activeren van de agent" },
      { status: 500 }
    );
  }
}






