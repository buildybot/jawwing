import { getDeviceId } from './deviceId';

const API_BASE_URL = 'https://www.jawwing.com/api/v1';

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
  imageUrl?: string;
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
  image_url?: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadImage(uri: string): Promise<{ url: string }> {
  const deviceId = await getDeviceId();
  const formData = new FormData();
  // React Native FormData accepts this shape
  formData.append('file', {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ url: string }>;
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

export async function createReply(
  postId: string,
  content: string,
): Promise<Reply> {
  return request<Reply>(`/posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function reportPost(postId: string, reason: string): Promise<void> {
  await request<void>(`/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getMyPosts(): Promise<Post[]> {
  return request<Post[]>('/posts/mine');
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
  const data = await request<{ territories: Territory[] }>('/territories');
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
    `/feed/territory/${id}?${q.toString()}`
  );
}
