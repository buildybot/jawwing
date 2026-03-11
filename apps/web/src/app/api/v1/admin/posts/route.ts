import { NextRequest, NextResponse } from "next/server";
import { db, posts, nanoid } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { latLngToH3 } from "@jawwing/api/geo";
import crypto from "crypto";
import { isAdmin } from "@jawwing/api/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

// ─── GET /api/v1/admin/posts ──────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";

  try {
    const c = getClient();
    let sql = `SELECT id, substr(content, 1, 150) as content, score, upvotes, downvotes, reply_count,
               status, created_at, h3_index, mod_confidence, account_id, image_url, video_url, ip_hash
               FROM posts WHERE 1=1`;
    const args: (string | number)[] = [];

    if (status && ["active", "moderated", "removed", "pending", "expired", "mod_failed"].includes(status)) {
      sql += " AND status = ?";
      args.push(status);
    }
    if (search) {
      sql += " AND content LIKE ?";
      args.push(`%${search}%`);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    args.push(limit, offset);

    const rows = await c.execute({ sql, args });
    const total = await c.execute("SELECT COUNT(*) as count FROM posts");

    return NextResponse.json({
      posts: rows.rows,
      total: Number(total.rows[0]?.count ?? 0),
      limit,
      offset,
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/posts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/v1/admin/posts ─────────────────────────────────────────────────

function requireAdminKey(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-admin-key");
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY?.trim()) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { content, lat, lng, image_url, image_width, image_height, score } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const sanitized = content.replace(/<[^>]*>/g, "").trim();
    if (sanitized.length < 1 || sanitized.length > 300) {
      return NextResponse.json({ error: "content must be 1-300 characters" }, { status: 400 });
    }
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const h3_index = latLngToH3(lat, lng);
    const id = nanoid();
    const ip_hash = crypto.randomBytes(8).toString("hex");
    const created_at = body.created_at ?? Math.floor(Date.now() / 1000);
    const expires_at = body.expires_at ?? created_at + 48 * 3600;

    // Extract video metadata
    let video_url: string | null = null;
    let video_thumbnail: string | null = null;
    const urlMatch = sanitized.match(/https?:\/\/[^\s)>\]"]+/i);
    if (urlMatch) {
      try {
        const u = new URL(urlMatch[0]);
        const host = u.hostname.replace(/^www\./, "").toLowerCase();
        if (host === "youtube.com" || host === "youtu.be") {
          let vid = host === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
          if (u.pathname.startsWith("/shorts/")) vid = u.pathname.split("/shorts/")[1]?.split(/[?#]/)[0] ?? null;
          if (vid) { video_url = urlMatch[0]; video_thumbnail = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`; }
        }
      } catch {}
    }

    const [created] = await db.insert(posts).values({
      id,
      user_id: `admin_seed_${nanoid()}`,
      account_id: null,
      ip_hash,
      content: sanitized,
      lat, lng, h3_index,
      score: score ?? 0,
      reply_count: 0,
      created_at, expires_at,
      status: "active",
      image_url: image_url ?? null,
      image_width: image_width ?? null,
      image_height: image_height ?? null,
      video_url, video_thumbnail,
    }).returning();

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/posts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/v1/admin/posts ───────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (body.all === true) {
      await db.delete(posts);
      return NextResponse.json({ deleted: "all" });
    }
    if (body.id) {
      const [deleted] = await db.delete(posts).where(eq(posts.id, body.id)).returning();
      if (!deleted) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      return NextResponse.json({ deleted: deleted.id });
    }
    return NextResponse.json({ error: "Provide { id } or { all: true }" }, { status: 400 });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/posts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
