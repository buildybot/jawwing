// ─── Jawwing API Client ───────────────────────────────────────────────────────

const BASE = "/api";

// ─── Token management (kept for agent API key support only) ──────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jawwing_token");
}

export function setToken(token: string): void {
  localStorage.setItem("jawwing_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("jawwing_token");
}

/** @deprecated — human auth removed. Always returns false. */
export function isAuthenticated(): boolean {
  return false;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  content: string;
  score: number;
  reply_count: number;
  created_at: number;
  expires_at: number;
  lat: number;
  lng: number;
  h3_index: string;
  status: string;
  user_id?: string;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  // computed client-side
  timeAgo?: string;
  distance?: string;
}

export interface Reply {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  content: string;
  created_at: number;
  status: string;
  user_id?: string;
}

export interface ModAction {
  id: string;
  post_id: string;
  agent_id: string;
  action: "approved" | "removed" | "flagged";
  rule_cited: string;
  reasoning: string;
  confidence: number;
  post_excerpt?: string;
  created_at: number;
}

export interface ConstitutionRule {
  id: string;
  section: string;
  heading: string;
  tag: string;
  text: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Cookies (including jw_session) are sent automatically by the browser.
  // Only attach Authorization for agent API key calls (programmatic use).
  const token = getToken();
  if (token?.startsWith("jw_")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: "same-origin" });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errMsg = data.error ?? errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function fetchPosts(
  lat: number,
  lng: number,
  sort: "hot" | "new" | "top" = "hot",
  limit = 20,
  offset = 0,
  mode: "auto" | "radius" | "territory" | "everywhere" = "auto",
  radiusMeters?: number
): Promise<{ posts: Post[]; meta: { limit: number; offset: number; count: number; mode?: string; territoryId?: string } }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    sort,
    limit: String(limit),
    offset: String(offset),
    mode,
  });
  if (radiusMeters != null) params.set("radius", String(radiusMeters));
  return request(`/v1/posts?${params}`);
}

export async function createPost(
  content: string,
  lat: number,
  lng: number,
  image_url?: string
): Promise<{ post: Post }> {
  return request("/v1/posts", {
    method: "POST",
    body: JSON.stringify({ content, lat, lng, ...(image_url ? { image_url } : {}) }),
  });
}

export async function getPost(id: string): Promise<{ post: Post }> {
  return request(`/v1/posts/${id}`);
}

export async function votePost(
  id: string,
  value: 1 | -1
): Promise<{ vote: unknown; changed: boolean; scoreDelta?: number }> {
  return request(`/v1/posts/${id}/vote`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

// ─── Replies ──────────────────────────────────────────────────────────────────

export async function getReplies(
  postId: string,
  limit = 50,
  offset = 0
): Promise<{ replies: Reply[]; meta: { limit: number; offset: number; count: number } }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return request(`/v1/posts/${postId}/replies?${params}`);
}

export async function createReply(
  postId: string,
  content: string,
  parentReplyId?: string
): Promise<{ reply: Reply }> {
  return request(`/v1/posts/${postId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content, parent_reply_id: parentReplyId ?? null }),
  });
}

export async function fetchNewPosts(
  lat: number,
  lng: number,
  since: number,
  radius = 5000
): Promise<{ posts: Post[]; meta: { since: number; count: number } }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    since: String(since),
    radius: String(radius),
  });
  return request(`/v1/posts/new?${params}`);
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export async function getModActions(params: {
  post_id?: string;
  agent_id?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ actions: ModAction[]; meta: { limit: number; offset: number; count: number } }> {
  const sp = new URLSearchParams();
  if (params.post_id) sp.set("post_id", params.post_id);
  if (params.agent_id) sp.set("agent_id", params.agent_id);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  return request(`/v1/mod/actions?${sp}`);
}

export async function getConstitution(): Promise<{ constitution: ConstitutionRule[] }> {
  return request("/v1/mod/constitution");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${BASE}/auth/logout`, { method: "POST" });
  } catch {
    // best-effort
  }
  clearToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem("jawwing_user");
  }
}

export async function sendCode(phone: string): Promise<{ message: string }> {
  return request("/auth/send-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyCode(
  phone: string,
  code: string
): Promise<{ token: string; user: { id: string; display_name: string; type: "human" | "agent" } }> {
  const result = await request<{ token: string; user: { id: string; display_name: string; type: "human" | "agent" } }>(
    "/auth/verify",
    {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }
  );
  setToken(result.token);
  return result;
}

// ─── Territories ──────────────────────────────────────────────────────────────

export interface Territory {
  id: string;
  name: string;
  h3_indexes: string[];
  assigned_agent_id: string | null;
  created_at: number;
  post_count: number;
  active_24h: number;
}

export async function getTerritories(): Promise<{ territories: Territory[] }> {
  return request("/v1/territories");
}

export async function getTerritoryFeed(
  id: string,
  sort: "hot" | "new" | "top" = "hot",
  limit = 20,
  offset = 0
): Promise<{
  territory: { id: string; name: string };
  posts: Post[];
  meta: { limit: number; offset: number; count: number };
}> {
  const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
  return request(`/v1/feed/territory/${id}?${params}`);
}

// ─── Constitution versioning ──────────────────────────────────────────────────

export interface ConstitutionVersionSummary {
  id: string;
  version: string;
  summary: string;
  created_at: number;
  created_by: string;
  status: "active" | "archived" | "proposed" | "rejected";
}

export interface ConstitutionVersionFull extends ConstitutionVersionSummary {
  content: unknown;
}

export interface ConstitutionAmendment {
  id: string;
  proposer_id: string;
  title: string;
  description: string;
  section: string;
  proposed_text: string;
  status: "pending_review" | "under_vote" | "accepted" | "rejected";
  mod_reasoning: string | null;
  votes_for: number;
  votes_against: number;
  vote_deadline: number | null;
  created_at: number;
  resolved_at: number | null;
}

export async function getConstitutionVersions(): Promise<{ versions: ConstitutionVersionSummary[] }> {
  return request("/v1/constitution/versions");
}

export async function getConstitutionVersion(id: string): Promise<{ version: ConstitutionVersionFull }> {
  return request(`/v1/constitution/versions/${id}`);
}

export async function getConstitutionAmendments(
  status?: string
): Promise<{ amendments: ConstitutionAmendment[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/v1/constitution/amendments${qs}`);
}

export async function submitConstitutionAmendment(body: {
  title: string;
  description: string;
  section: string;
  proposed_text: string;
}): Promise<{ amendment: ConstitutionAmendment }> {
  return request("/v1/constitution/amendments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatTimeAgo(unixSec: number): string {
  const diffMs = Date.now() - unixSec * 1000;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist < 0.1 ? "<0.1mi" : `${dist.toFixed(1)}mi`;
}
