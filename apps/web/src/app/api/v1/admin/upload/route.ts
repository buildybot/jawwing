import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "@jawwing/db";
import { validateUrl } from "@/lib/ssrf-guard";
import { isAdmin } from "@jawwing/api/admin";

// ─── POST /api/v1/admin/upload ────────────────────────────────────────────────
// Body: { "url": "https://...", "filename": "image.jpg" }
// Downloads image from URL and re-uploads to Vercel Blob storage.
// Returns the blob URL for use in seeded posts.

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    let body: { url: string; filename?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { url, filename } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // SSRF protection: validate scheme and resolve DNS before fetching
    const safeUrl = await validateUrl(url);
    if (!safeUrl) {
      return NextResponse.json({ error: "Invalid URL", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN not configured", code: "SERVICE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    // Fetch the image from the validated source URL
    let fetchRes: Response;
    try {
      fetchRes = await fetch(safeUrl, { signal: AbortSignal.timeout(5000) });
    } catch (e) {
      return NextResponse.json({ error: `Failed to fetch URL: ${e}`, code: "FETCH_ERROR" }, { status: 400 });
    }

    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: `Source URL returned ${fetchRes.status}`, code: "FETCH_ERROR" },
        { status: 400 }
      );
    }

    const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";
    const ext = filename?.split(".").pop() ?? contentType.split("/")[1] ?? "jpg";
    const blobPath = `admin-uploads/${nanoid()}-${Date.now()}.${ext}`;

    const imageBuffer = await fetchRes.arrayBuffer();

    const blob = await put(blobPath, imageBuffer, {
      access: "public",
      contentType,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/upload]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
