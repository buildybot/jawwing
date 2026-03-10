import { NextResponse } from "next/server";
import { CONSTITUTION_RULES } from "@jawwing/mod/engine";

// ─── GET /api/v1/mod/constitution ─────────────────────────────────────────────
// Public endpoint — returns the Jawwing Moderation Constitution as JSON.

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ constitution: CONSTITUTION_RULES });
}
