import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.jawwing.com';
const TOKEN_KEY = 'jawwing_auth_token';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  content: string;
  score: number;
  replyCount: number;
  createdAt: string;
  distance?: number; // meters from current location
  userVote?: 1 | -1 | null;
  authorId: string;
  locationName?: string;
  moderated?: boolean;
  moderationReason?: string;
}

export interface Reply {
  id: string;
  postId: string;
  content: string;
  score: number;
  createdAt: string;
  userVote?: 1 | -1 | null;
  authorId: string;
}

export interface GetPostsParams {
  sort?: 'hot' | 'new' | 'top';
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}

export interface CreatePostParams {
  content: string;
  lat: number;
  lng: number;
}

export interface AuthResponse {
  token: string;
  userId: string;
  displayName: string;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export async function getPosts(params: GetPostsParams = {}): Promise<Post[]> {
  const q = new URLSearchParams();
  if (params.sort) q.set('sort', params.sort);
  if (params.lat != null) q.set('lat', String(params.lat));
  if (params.lng != null) q.set('lng', String(params.lng));
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  return request<Post[]>(`/posts?${q.toString()}`);
}

export async function createPost(params: CreatePostParams): Promise<Post> {
  return request<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function vote(postId: string, value: 1 | -1 | 0): Promise<{ score: number }> {
  return request<{ score: number }>(`/posts/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

export async function getReplies(postId: string): Promise<Reply[]> {
  return request<Reply[]>(`/posts/${postId}/replies`);
}

export async function sendCode(phone: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyCode(
  phone: string,
  code: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  await setToken(data.token);
  return data;
}

export async function getMyPosts(): Promise<Post[]> {
  return request<Post[]>('/users/me/posts');
}

export async function getProfile(): Promise<{ displayName: string; userId: string }> {
  return request<{ displayName: string; userId: string }>('/users/me');
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

export async function getTerritories(): Promise<Territory[]> {
  const data = await request<{ territories: Territory[] }>('/v1/territories');
  return data.territories;
}

export interface GetTerritoryFeedParams {
  sort?: 'hot' | 'new' | 'top';
  limit?: number;
  offset?: number;
}

export async function getTerritoryFeed(
  id: string,
  params: GetTerritoryFeedParams = {}
): Promise<{ territory: { id: string; name: string }; posts: Post[] }> {
  const q = new URLSearchParams();
  if (params.sort) q.set('sort', params.sort);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  return request<{ territory: { id: string; name: string }; posts: Post[] }>(
    `/v1/feed/territory/${id}?${q.toString()}`
  );
}
