import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// Store received emails in DB for the bot to poll
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Ensure table exists
let tableCreated = false;
async function ensureTable() {
  if (tableCreated) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS inbound_emails (
    id TEXT PRIMARY KEY,
    from_email TEXT,
    to_email TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  )`);
  tableCreated = true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Resend inbound email webhook payload
    if (body.type === "email.received" && body.data) {
      await ensureTable();
      const d = body.data;
      const id = d.email_id || d.id || crypto.randomUUID();
      await db.execute({
        sql: `INSERT OR REPLACE INTO inbound_emails (id, from_email, to_email, subject, body_text, body_html, received_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          d.from || "",
          JSON.stringify(d.to || []),
          d.subject || "",
          d.text || "",
          d.html || "",
          Math.floor(Date.now() / 1000),
        ],
      });
      console.log(`[webhook] Stored inbound email: ${d.subject} from ${d.from}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
