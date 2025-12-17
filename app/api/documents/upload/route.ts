import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) ?? file?.name ?? "Onbenoemd document";
    const projectIdParam = formData.get("projectId") as string | null;
    const scopeParam = formData.get("scope") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Bestand (file) is verplicht" },
        { status: 400 }
      );
    }

    // Bepaal (of maak) workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(user.id);
    const orgId = await getCurrentOrgId(user.id);

    // Determine scope and projectId
    let projectId: string | null = null;
    let scope: "GLOBAL" | "PROJECT";

    if (scopeParam === "GLOBAL") {
      scope = "GLOBAL";
      projectId = null;
    } else if (scopeParam === "PROJECT" || projectIdParam) {
      scope = "PROJECT";
      
      // If scope is PROJECT, projectId must be provided
      if (!projectIdParam) {
        return NextResponse.json(
          { error: "projectId is verplicht wanneer scope=PROJECT" },
          { status: 400 }
        );
      }

      // Validate projectId belongs to current org
      const project = await prisma.project.findFirst({
        where: {
          id: projectIdParam,
          organizationId: orgId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project niet gevonden voor deze organisatie" },
          { status: 404 }
        );
      }

      projectId = projectIdParam;
    } else {
      return NextResponse.json(
        { error: "scope (GLOBAL of PROJECT) of projectId is verplicht" },
        { status: 400 }
      );
    }

    // Create document record first to get the document ID
    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        organizationId: orgId,
        scope,
        projectId,
        title,
        fileUrl: "", // Will be updated after upload
        status: "uploaded",
      },
    });

    // Ensure the documents bucket exists
    const bucketName = "documents";
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error("[DOCUMENTS][UPLOAD] Error listing buckets:", bucketsError);
      // Update document status to failed
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: `Failed to check storage buckets: ${bucketsError.message}`,
        },
      });
      return NextResponse.json(
        { error: "Failed to access storage", details: bucketsError.message },
        { status: 500 }
      );
    }

    // Create bucket if it doesn't exist
    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false, // Private bucket
      });

      if (createBucketError) {
        console.error("[DOCUMENTS][UPLOAD] Error creating bucket:", createBucketError);
        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: "failed",
            error: `Failed to create storage bucket: ${createBucketError.message}`,
          },
        });
        return NextResponse.json(
          { error: "Failed to create storage bucket", details: createBucketError.message },
          { status: 500 }
        );
      }
    }

    // Build storage path: org/<orgId>/project/<projectId|null>/doc/<documentId>/<originalFileName>
    const projectSegment = projectId ? `project/${projectId}` : "project/null";
    const storagePath = `org/${orgId}/${projectSegment}/doc/${document.id}/${encodeURIComponent(file.name)}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error("[DOCUMENTS][UPLOAD] Error uploading file:", uploadError);
      // Update document status to failed
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: `Upload failed: ${uploadError.message}`,
        },
      });
      return NextResponse.json(
        { error: "Failed to upload file to storage", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL (or signed URL if bucket is private)
    // For private buckets, we'll store the path and generate signed URLs when needed
    const fileUrl = uploadData.path; // Store the storage path

    // Update document with the storage path
    await prisma.document.update({
      where: { id: document.id },
      data: {
        fileUrl,
        status: "uploaded",
      },
    });

    return NextResponse.json(
      {
        documentId: document.id,
        workspaceId: document.workspaceId,
        status: "uploaded",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[DOCUMENTS][UPLOAD] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      { error: "Er is iets misgegaan bij het uploaden van het document", details: message },
      { status: 500 }
    );
  }
}


