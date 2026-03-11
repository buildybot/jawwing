import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db, uploads, nanoid, now } from "@jawwing/db";
import { getIpHash } from "@jawwing/api/anonymous";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

// ─── In-memory rate limiter (replace with Redis in prod) ─────────────────────

const uploadRateLimiter = new Map<string, { count: number; windowStart: number }>();

function checkUploadRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = uploadRateLimiter.get(ipHash);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    uploadRateLimiter.set(ipHash, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── POST /api/v1/upload ──────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check blob storage is configured before doing anything else
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[upload] BLOB_READ_WRITE_TOKEN is not set');
      return NextResponse.json(
        { error: 'Image upload requires BLOB_READ_WRITE_TOKEN', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    const ipHash = getIpHash(req);

    if (!checkUploadRateLimit(ipHash)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 uploads per hour.", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Use field name 'file'.", code: "MISSING_FILE" },
        { status: 400 }
      );
    }

    // Validate content type
    const fileType = file.type;
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${fileType}. Allowed: jpeg, png, gif, webp`, code: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max size: 5MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`, code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `uploads/${nanoid()}-${Date.now()}.${fileType.split("/")[1]}`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: fileType,
    });

    const id = nanoid();

    // Store upload record
    await db.insert(uploads).values({
      id,
      url: blob.url,
      content_type: fileType,
      size: file.size,
      width: null,
      height: null,
      ip_hash: ipHash,
      created_at: now(),
      moderation_status: "pending",
    });

    return NextResponse.json({ url: blob.url, id, width: null, height: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/upload]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
