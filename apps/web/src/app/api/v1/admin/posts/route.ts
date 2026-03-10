import { NextRequest, NextResponse } from "next/server";
import { db, posts, nanoid } from "@jawwing/db";
import { eq, sql } from "drizzle-orm";
import { latLngToH3 } from "@jawwing/api/geo";
import crypto from "crypto";

// ─── Auth helper ──────────────────────────────────────────────────────────────

function requireAdminKey(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-admin-key");
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

function randomIpHash(): string {
  return crypto.randomBytes(8).toString("hex");
}

// ─── POST /api/v1/admin/posts ─────────────────────────────────────────────────
// Bypasses: rate limiting, location spoofing, AI moderation, anti-spam.
// Seeds a post directly from any lat/lng.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    let body: {
      content: string;
      lat: number;
      lng: number;
      image_url?: string;
      image_width?: number;
      image_height?: number;
      score?: number;
      created_at?: number;
      expires_at?: number;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { content, lat, lng, image_url, image_width, image_height, score } = body;

    // Content length validation (1–300 chars)
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const sanitized = content.replace(/<[^>]*>/g, "").trim();
    if (sanitized.length < 1 || sanitized.length > 300) {
      return NextResponse.json(
        { error: "content must be 1–300 characters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Coordinate validation
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const h3_index = latLngToH3(lat, lng);
    const id = nanoid();
    const ip_hash = randomIpHash();

    const created_at = body.created_at ?? Math.floor(Date.now() / 1000);
    const expires_at = body.expires_at ?? created_at + 86400;

    const [created] = await db.insert(posts).values({
      id,
      user_id: `admin_seed_${nanoid()}`,
      account_id: null,
      ip_hash,
      content: sanitized,
      lat,
      lng,
      h3_index,
      score: score ?? 0,
      reply_count: 0,
      created_at,
      expires_at,
      status: "active",
      ...(image_url ? { image_url, image_width: image_width ?? null, image_height: image_height ?? null } : {}),
    }).returning();

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── DELETE /api/v1/admin/posts ───────────────────────────────────────────────
// Body: { "id": "post-id" }  — delete one post
// Body: { "all": true }      — delete ALL posts (nuclear reset)

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    let body: { id?: string; all?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    if (body.all === true) {
      await db.delete(posts);
      return NextResponse.json({ deleted: "all", message: "All posts nuked." });
    }

    if (body.id) {
      const [deleted] = await db.delete(posts).where(eq(posts.id, body.id)).returning();
      if (!deleted) {
        return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ deleted: deleted.id });
    }

    return NextResponse.json(
      { error: "Provide { id } or { all: true }", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[DELETE /api/v1/admin/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
