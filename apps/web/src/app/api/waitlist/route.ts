import { NextRequest, NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();

    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Persist to DB if configured
    if (process.env.TURSO_DATABASE_URL) {
      try {
        const { createClient } = await import("@libsql/client");
        const { drizzle } = await import("drizzle-orm/libsql");
        const { waitlist } = await import("@jawwing/db");
        const { nanoid } = await import("nanoid");

        const client = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
        });
        const db = drizzle(client);

        // Create waitlist table if it doesn't exist (idempotent DDL)
        await client.execute(`
          CREATE TABLE IF NOT EXISTS waitlist (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL
          )
        `);

        await db.insert(waitlist).values({
          id: nanoid(),
          email: trimmed,
          created_at: Math.floor(Date.now() / 1000),
        }).onConflictDoNothing();

        client.close();
      } catch (dbErr) {
        // Log but don't fail the user — DB may not be migrated yet
        console.error("[waitlist] DB insert error:", dbErr);
      }
    }

    console.log(`[waitlist] New signup: ${trimmed} at ${new Date().toISOString()}`);

    return NextResponse.json({ success: true, message: "YOU'RE ON THE LIST" });
  } catch (err) {
    console.error("[waitlist] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
