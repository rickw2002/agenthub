import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Je moet ingelogd zijn om outputs te verwijderen.",
        },
        { status: 401 }
      );
    }

    const workspace = await getOrCreateWorkspace(session.user.id);
    const { id } = params;

    // Check if output exists and belongs to workspace
    const output = await prisma.output.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!output) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Output niet gevonden.",
        },
        { status: 404 }
      );
    }

    // Delete output
    await prisma.output.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BureauAIErrorImpl) {
      return NextResponse.json(
        {
          ok: false,
          code: err.code,
          message: err.message,
          action:
            err.action ??
            "Probeer het later opnieuw of neem contact op met de ondersteuning.",
        },
        { status: err.status }
      );
    }

    console.error("[OUTPUTS][DELETE] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Er is een onverwachte fout opgetreden bij het verwijderen van de output.",
      },
      { status: 500 }
    );
  }
}

