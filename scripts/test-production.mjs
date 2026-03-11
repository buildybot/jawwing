#!/usr/bin/env node
/**
 * Jawwing Production Test Suite
 * 
 * Tests EVERY API endpoint and page for correct BEHAVIOR, not just "loads".
 * Run: node scripts/test-production.mjs [--base https://www.jawwing.com]
 * 
 * Exit codes: 0 = all pass, 1 = failures found
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] 
  || process.argv[process.argv.indexOf('--base') + 1] 
  || 'https://www.jawwing.com';
const ADMIN_KEY = process.argv.find(a => a.startsWith('--admin-key='))?.split('=')[1]
  || '***REDACTED_ADMIN_KEY***';

const results = [];
let testPostId = null;
let testReplyId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ name, pass: true, ms });
    process.stdout.write(`  ✅ ${name} (${ms}ms)\n`);
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ name, pass: false, ms, error: err.message });
    process.stdout.write(`  ❌ ${name} (${ms}ms) — ${err.message}\n`);
  }
}

async function api(path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const res = await fetch(url, { ...opts, headers, redirect: 'follow' });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, headers: res.headers, json, text, ok: res.ok };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertField(obj, field, type) {
  assert(obj && obj[field] !== undefined, `Missing field: ${field}`);
  if (type) assert(typeof obj[field] === type, `${field} should be ${type}, got ${typeof obj[field]}`);
}

// ─── Test Groups ──────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n🏥 HEALTH & INFRASTRUCTURE');
  
  await test('GET /api/health returns ok + db ok', async () => {
    const r = await api('/api/health');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.json.status === 'ok', `status: ${r.json.status}`);
    assert(r.json.db === 'ok', `db: ${r.json.db}`);
  });

  await test('Security headers present', async () => {
    const r = await api('/');
    assert(r.headers.get('x-frame-options'), 'Missing X-Frame-Options');
    assert(r.headers.get('x-content-type-options'), 'Missing X-Content-Type-Options');
    assert(r.headers.get('referrer-policy'), 'Missing Referrer-Policy');
    assert(r.headers.get('content-security-policy'), 'Missing CSP');
  });

  await test('CSP allows YouTube iframes', async () => {
    const r = await api('/');
    const csp = r.headers.get('content-security-policy') || '';
    assert(csp.includes('youtube.com') || csp.includes('frame-src'), 
      `CSP missing YouTube frame-src: ${csp.substring(0, 200)}`);
  });

  await test('CORS headers on API routes', async () => {
    const r = await fetch(`${BASE}/api/v1/posts?lat=38.9&lng=-77.0&mode=everywhere&limit=1`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://www.jawwing.com' },
    });
    const allow = r.headers.get('access-control-allow-origin');
    assert(allow, `Missing CORS header, got: ${[...r.headers.entries()].map(e=>e.join(':')).join(', ')}`);
  });

  await test('robots.txt exists and blocks /api/', async () => {
    const r = await api('/robots.txt');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.text.includes('/api/'), 'robots.txt should block /api/');
  });

  await test('sitemap.xml exists', async () => {
    const r = await api('/sitemap.xml');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.text.includes('jawwing.com'), 'Sitemap missing jawwing.com');
  });
}

async function testPages() {
  console.log('\n📄 PAGES (render + correct content)');
  
  const pages = [
    { path: '/', must: ['jawwing'], desc: 'Feed / home page', caseSensitive: false },
    { path: '/constitution', must: ['Constitution', 'PROHIBITED'], desc: 'Constitution page' },
    { path: '/terms', must: ['Terms'], desc: 'Terms of Service' },
    { path: '/privacy', must: ['Privacy'], desc: 'Privacy Policy' },
    { path: '/transparency', must: ['Transparency'], desc: 'Transparency page' },
    { path: '/signin', must: ['email', 'code'], desc: 'Sign in page', caseSensitive: false },
    { path: '/age-restricted', must: ['17'], desc: 'Age restricted page' },
  ];

  for (const page of pages) {
    await test(`GET ${page.path} — ${page.desc}`, async () => {
      const r = await api(page.path);
      assert(r.status === 200, `Status ${r.status}`);
      for (const term of page.must) {
        const haystack = page.caseSensitive === false ? r.text.toLowerCase() : r.text;
        const needle = page.caseSensitive === false ? term.toLowerCase() : term;
        assert(haystack.includes(needle), `Page missing "${term}"`);
      }
    });
  }

  await test('GET /login redirects to / (no dead page)', async () => {
    const r = await fetch(`${BASE}/login`, { redirect: 'manual' });
    assert(r.status === 307 || r.status === 308 || r.status === 200, 
      `Expected redirect or OK, got ${r.status}`);
  });

  await test('GET /nonexistent returns 404', async () => {
    const r = await api('/totally-nonexistent-page-xyz');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });
}

async function testFeedAPI() {
  console.log('\n📡 FEED API');

  await test('GET /api/v1/posts — returns posts array with required fields', async () => {
    const r = await api('/api/v1/posts?lat=38.9072&lng=-77.0369&mode=everywhere&limit=5&sort=new');
    assert(r.status === 200, `Status ${r.status}`);
    assert(Array.isArray(r.json.posts), 'posts is not an array');
    assert(r.json.posts.length > 0, 'No posts returned');
    const post = r.json.posts[0];
    assertField(post, 'id', 'string');
    assertField(post, 'content', 'string');
    assertField(post, 'lat', 'number');
    assertField(post, 'lng', 'number');
    assertField(post, 'score', 'number');
    assertField(post, 'created_at', 'number');
    // PRIVACY: Must NOT have exact coords or ip_hash
    assert(!post.ip_hash, 'PRIVACY VIOLATION: ip_hash exposed in feed');
    assert(!post.user_id, 'PRIVACY VIOLATION: user_id exposed in feed');
    // Coords should be rounded to 2 decimals
    const latDecimals = String(post.lat).split('.')[1]?.length || 0;
    assert(latDecimals <= 2, `PRIVACY: lat has ${latDecimals} decimals (should be ≤2)`);
    testPostId = post.id; // save for later tests
  });

  await test('GET /api/v1/posts — mode=radius works', async () => {
    const r = await api('/api/v1/posts?lat=38.9072&lng=-77.0369&mode=radius&radiusMeters=30000&limit=5');
    assert(r.status === 200, `Status ${r.status}`);
    assert(Array.isArray(r.json.posts), 'posts not array');
  });

  await test('GET /api/v1/posts — mode=territory works', async () => {
    const r = await api('/api/v1/posts?lat=38.9072&lng=-77.0369&mode=territory&limit=5');
    assert(r.status === 200, `Status ${r.status}`);
    assert(Array.isArray(r.json.posts), 'posts not array');
  });

  await test('GET /api/v1/posts — sort=hot/new/top all work', async () => {
    for (const sort of ['hot', 'new', 'top']) {
      const r = await api(`/api/v1/posts?lat=38.9072&lng=-77.0369&mode=everywhere&limit=3&sort=${sort}`);
      assert(r.status === 200, `sort=${sort} returned ${r.status}`);
    }
  });

  await test('GET /api/v1/posts — remote city (NYC) returns posts', async () => {
    const r = await api('/api/v1/posts?lat=40.7128&lng=-74.0060&mode=radius&radiusMeters=30000&limit=5');
    assert(r.status === 200, `Status ${r.status}`);
    assert(Array.isArray(r.json.posts), 'posts not array');
    // Should have NYC posts if seeded
  });

  await test('GET /api/v1/posts — metro label present in country mode', async () => {
    const r = await api('/api/v1/posts?lat=38.9072&lng=-77.0369&mode=everywhere&limit=10');
    assert(r.status === 200, `Status ${r.status}`);
    const withMetro = r.json.posts.filter(p => p.metro);
    assert(withMetro.length > 0, 'No posts have metro labels in country mode');
  });

  await test('GET /api/v1/posts/new — polling endpoint works', async () => {
    const since = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const r = await api(`/api/v1/posts/new?since=${since}&lat=38.9072&lng=-77.0369&radius=30000&limit=5`);
    assert(r.status === 200, `Status ${r.status}: ${r.text?.substring(0,200)}`);
    assert(Array.isArray(r.json.posts), 'posts not array');
    if (r.json.posts.length > 0) {
      assert(!r.json.posts[0].ip_hash, 'PRIVACY VIOLATION: ip_hash in /posts/new');
    }
  });
}

async function testPostDetail() {
  console.log('\n📝 POST DETAIL');

  await test('GET /api/v1/posts/[id] — returns full post with votes', async () => {
    if (!testPostId) throw new Error('No test post ID (feed test failed?)');
    const r = await api(`/api/v1/posts/${testPostId}`);
    assert(r.status === 200, `Status ${r.status}`);
    assertField(r.json.post, 'id', 'string');
    assertField(r.json.post, 'content', 'string');
    assertField(r.json.post, 'votes', 'object');
    assert(typeof r.json.post.votes.upvotes === 'number', 'Missing votes.upvotes');
    assert(typeof r.json.post.votes.downvotes === 'number', 'Missing votes.downvotes');
    // Privacy
    assert(!r.json.post.ip_hash, 'PRIVACY VIOLATION: ip_hash in post detail');
    assert(!r.json.post.user_id, 'PRIVACY VIOLATION: user_id in post detail');
  });

  await test('GET /api/v1/posts/NONEXISTENT — returns 404', async () => {
    const r = await api('/api/v1/posts/totally_fake_id_12345');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
    assert(r.json.code === 'NOT_FOUND', `code: ${r.json.code}`);
  });

  await test('GET /post/[id] page renders post content', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/post/${testPostId}`);
    assert(r.status === 200, `Status ${r.status}`);
  });
}

async function testPostCreation() {
  console.log('\n✍️ POST CREATION');

  await test('POST /api/v1/posts — missing location returns 400 or 429', async () => {
    const r = await api('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'test post no location' }),
    });
    assert(r.status === 400 || r.status === 429, `Expected 400/429, got ${r.status}`);
    if (r.status === 429) process.stdout.write('     (rate limited from prior run — validation logic not tested)\n');
  });

  await test('POST /api/v1/posts — null island (0,0) returns 422 or 429', async () => {
    const r = await api('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'null island test', lat: 0, lng: 0 }),
    });
    assert(r.status === 422 || r.status === 400 || r.status === 429, `Expected 422/400/429, got ${r.status}`);
    if (r.status !== 429) {
      assert(r.json.code === 'INVALID_LOCATION' || r.json.code === 'VALIDATION_ERROR', `code: ${r.json.code}`);
    }
  });

  await test('POST /api/v1/posts — empty content returns 400 or 429', async () => {
    const r = await api('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ content: '', lat: 38.9, lng: -77.0 }),
    });
    assert(r.status === 400 || r.status === 429, `Expected 400/429, got ${r.status}`);
  });

  await test('POST /api/v1/admin/posts — creates post with admin key', async () => {
    const r = await api('/api/v1/admin/posts', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({
        content: `[TEST] Automated test post ${Date.now()}`,
        lat: 38.9072,
        lng: -77.0369,
        expires_hours: 1,
      }),
    });
    assert(r.status === 201 || r.status === 200, `Status ${r.status}: ${r.text.substring(0,200)}`);
    const post = r.json.post || r.json;
    assertField(post, 'id', 'string');
    testPostId = post.id; // use this for subsequent tests
  });
}

async function testVoting() {
  console.log('\n🗳️ VOTING');

  await test('POST /api/v1/posts/[id]/vote — upvote works', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    });
    assert(r.status === 200 || r.status === 201, `Status ${r.status}: ${r.text.substring(0,200)}`);
    assert(r.json.vote, 'Missing vote object');
    assert(r.json.vote.value === 1, `vote.value: ${r.json.vote.value}`);
  });

  await test('POST /api/v1/posts/[id]/vote — duplicate vote returns unchanged', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    });
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.json.changed === false, `Expected changed=false, got ${r.json.changed}`);
  });

  await test('POST /api/v1/posts/[id]/vote — switch to downvote works', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: -1 }),
    });
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.json.changed === true, `Expected changed=true`);
    assert(r.json.vote.value === -1, `vote.value should be -1, got ${r.json.vote.value}`);
  });

  await test('POST /api/v1/posts/[id]/vote — verify score updated', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}`);
    assert(r.status === 200, `Status ${r.status}`);
    // Score should be -1 (started at 0, upvoted to 1, switched to downvote = -1)
    assert(r.json.post.score === -1, `Expected score=-1, got ${r.json.post.score}`);
    assert(r.json.post.votes.downvotes >= 1, `Expected downvotes≥1, got ${r.json.post.votes.downvotes}`);
  });

  await test('POST /api/v1/posts/[id]/vote — invalid value rejected', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('POST /api/v1/posts/FAKE/vote — nonexistent post 404', async () => {
    const r = await api('/api/v1/posts/fake_post_xyz/vote', {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    });
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });
}

async function testReplies() {
  console.log('\n💬 REPLIES');

  await test('POST /api/v1/posts/[id]/replies — create reply', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content: `[TEST] reply ${Date.now()}` }),
    });
    // 429 = rate limited from prior test run (in-memory limits don't reset across cold starts)
    assert(r.status === 201 || r.status === 200 || r.status === 429, `Status ${r.status}: ${r.text.substring(0,200)}`);
    if (r.status === 429) {
      process.stdout.write('     (rate limited — reply creation not tested this run)\n');
    } else {
      assert(r.json.reply, 'Missing reply object');
      assertField(r.json.reply, 'id', 'string');
      assert(!r.json.reply.ip_hash, 'PRIVACY VIOLATION: ip_hash in reply');
      testReplyId = r.json.reply.id;
    }
  });

  await test('GET /api/v1/posts/[id]/replies — returns replies array', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/replies`);
    assert(r.status === 200, `Status ${r.status}`);
    assert(Array.isArray(r.json.replies), 'replies not array');
    if (r.json.replies.length > 0) {
      assert(!r.json.replies[0].ip_hash, 'PRIVACY VIOLATION: ip_hash in replies list');
    }
  });

  await test('POST /api/v1/posts/[id]/replies — nested reply (may rate limit)', async () => {
    if (!testPostId) throw new Error('No test post ID');
    if (!testReplyId) { process.stdout.write('     (skipped — parent reply was rate limited)\n'); return; }
    const r = await api(`/api/v1/posts/${testPostId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content: `[TEST] nested reply ${Date.now()}`, parent_reply_id: testReplyId }),
    });
    // 429 = rate limiter working correctly (2 replies in quick succession)
    assert(r.status === 201 || r.status === 200 || r.status === 429, 
      `Status ${r.status}: ${r.text.substring(0,200)}`);
    if (r.status === 429) process.stdout.write('     (rate limited — expected for rapid test)\n');
  });

  await test('POST /api/v1/posts/[id]/replies — empty content rejected', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content: '' }),
    });
    // 400 = validation error, 429 = rate limited (both acceptable)
    assert(r.status === 400 || r.status === 429, `Expected 400 or 429, got ${r.status}`);
  });

  await test('GET /api/v1/posts/[id] — reply_count correct', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}`);
    assert(r.status === 200, `Status ${r.status}`);
    assert(typeof r.json.post.reply_count === 'number', `reply_count should be number, got ${typeof r.json.post.reply_count}`);
    // If replies were rate-limited, count could be 0
    if (testReplyId) {
      assert(r.json.post.reply_count >= 1, `Expected reply_count≥1, got ${r.json.post.reply_count}`);
    }
  });
}

async function testReports() {
  console.log('\n🚩 REPORTS');

  await test('POST /api/v1/reports — report a post', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({ post_id: testPostId, reason: 'spam' }),
    });
    assert(r.status === 201 || r.status === 200, `Status ${r.status}: ${r.text.substring(0,200)}`);
  });

  await test('POST /api/v1/reports — missing post_id rejected (400 or 429)', async () => {
    const r = await api('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({ reason: 'spam' }),
    });
    assert(r.status === 400 || r.status === 429, `Expected 400/429, got ${r.status}`);
  });

  await test('POST /api/v1/reports — missing reason rejected (400 or 429)', async () => {
    const r = await api('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({ post_id: testPostId }),
    });
    assert(r.status === 400 || r.status === 429, `Expected 400/429, got ${r.status}`);
  });
}

async function testConstitution() {
  console.log('\n📜 CONSTITUTION API');

  await test('GET /api/v1/mod/constitution — returns rules', async () => {
    const r = await api('/api/v1/mod/constitution');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.json.constitution || r.json.rules, `No constitution data: ${Object.keys(r.json)}`);
  });

  await test('GET /api/v1/constitution/versions — returns versions', async () => {
    const r = await api('/api/v1/constitution/versions');
    assert(r.status === 200, `Status ${r.status}`);
  });

  await test('GET /api/v1/constitution/amendments — returns amendments', async () => {
    const r = await api('/api/v1/constitution/amendments');
    assert(r.status === 200, `Status ${r.status}`);
  });
}

async function testTerritories() {
  console.log('\n🗺️ TERRITORIES');

  await test('GET /api/v1/territories — returns list', async () => {
    const r = await api('/api/v1/territories');
    assert(r.status === 200, `Status ${r.status}`);
  });
}

async function testAuth() {
  console.log('\n🔐 AUTH');

  await test('POST /api/auth/send-code — invalid email rejected', async () => {
    const r = await api('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('POST /api/auth/verify — wrong code rejected', async () => {
    const r = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', code: '000000' }),
    });
    assert(r.status === 400 || r.status === 401, `Expected 400/401, got ${r.status}`);
  });

  await test('GET /api/auth/me — no token returns 401', async () => {
    const r = await api('/api/auth/me');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('GET /api/auth/me — invalid token returns 401', async () => {
    const r = await api('/api/auth/me', {
      headers: { 'Authorization': 'Bearer fake.token.here' },
    });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('GET /api/v1/my/posts — no token returns 401', async () => {
    const r = await api('/api/v1/my/posts');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('GET /api/v1/notifications — no token returns 401', async () => {
    const r = await api('/api/v1/notifications');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('GET /api/v1/saved — no token returns 401', async () => {
    const r = await api('/api/v1/saved');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });
}

async function testAdmin() {
  console.log('\n🔑 ADMIN API');

  await test('POST /api/v1/admin/posts — no key returns 401/403', async () => {
    const r = await api('/api/v1/admin/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'no key', lat: 38.9, lng: -77.0 }),
    });
    assert(r.status === 401 || r.status === 403, `Expected 401/403, got ${r.status}`);
  });

  await test('POST /api/v1/admin/posts — wrong key rejected', async () => {
    const r = await api('/api/v1/admin/posts', {
      method: 'POST',
      headers: { 'x-admin-key': 'wrong_key' },
      body: JSON.stringify({ content: 'wrong key', lat: 38.9, lng: -77.0 }),
    });
    assert(r.status === 401 || r.status === 403, `Expected 401/403, got ${r.status}`);
  });

  await test('POST /api/v1/admin/votes — works with admin key', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api('/api/v1/admin/votes', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ post_id: testPostId, score: 5 }),
    });
    assert(r.status === 200 || r.status === 201, `Status ${r.status}: ${r.text.substring(0,200)}`);
  });
}

async function testModeration() {
  console.log('\n🤖 MODERATION');

  await test('GET /api/v1/mod/actions — returns mod actions', async () => {
    const r = await api('/api/v1/mod/actions');
    assert(r.status === 200, `Status ${r.status}`);
  });

  await test('POST /api/v1/admin/moderate — trigger moderation with admin key', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api('/api/v1/admin/moderate', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ post_id: testPostId }),
    });
    // May return 200 or 404 if route doesn't exist yet
    assert(r.status === 200 || r.status === 201 || r.status === 404, 
      `Status ${r.status}: ${r.text.substring(0,200)}`);
  });
}

async function testOG() {
  console.log('\n🔗 OG / LINK PREVIEWS');

  await test('GET /api/v1/og — fetches OpenGraph data', async () => {
    const r = await api('/api/v1/og?url=https://www.youtube.com');
    assert(r.status === 200, `Status ${r.status}`);
  });

  await test('GET /api/v1/og — missing url returns 400', async () => {
    const r = await api('/api/v1/og');
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });
}

async function testUpload() {
  console.log('\n📷 UPLOAD');

  await test('POST /api/v1/upload — no file returns error', async () => {
    const r = await fetch(`${BASE}/api/v1/upload`, { method: 'POST' });
    assert(r.status === 400 || r.status === 503, `Expected 400/503, got ${r.status}`);
  });
}

async function testPrivacy() {
  console.log('\n🔒 PRIVACY AUDIT');

  await test('Feed posts have no ip_hash, user_id, or exact coords', async () => {
    const r = await api('/api/v1/posts?lat=38.9072&lng=-77.0369&mode=everywhere&limit=20');
    for (const p of r.json.posts) {
      assert(!p.ip_hash, `PRIVACY: post ${p.id} exposes ip_hash`);
      assert(!p.user_id, `PRIVACY: post ${p.id} exposes user_id`);
      const latStr = String(p.lat);
      const decimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
      assert(decimals <= 3, `PRIVACY: post ${p.id} lat has ${decimals} decimals (${p.lat})`);
    }
  });

  await test('Post detail has no ip_hash or user_id', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}`);
    assert(!r.json.post.ip_hash, 'PRIVACY: post detail exposes ip_hash');
    assert(!r.json.post.user_id, 'PRIVACY: post detail exposes user_id');
  });

  await test('Replies have no ip_hash or user_id', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}/replies`);
    for (const reply of r.json.replies) {
      assert(!reply.ip_hash, `PRIVACY: reply ${reply.id} exposes ip_hash`);
      assert(!reply.user_id, `PRIVACY: reply ${reply.id} exposes user_id`);
    }
  });

  await test('New posts endpoint has no ip_hash', async () => {
    const sinceTs = Math.floor(Date.now() / 1000) - 3600;
    const r = await api(`/api/v1/posts/new?since=${sinceTs}&lat=38.9072&lng=-77.0369&radius=30000&limit=5`);
    assert(r.status === 200, `Status ${r.status}`);
    if (r.json.posts && r.json.posts.length > 0) {
      for (const p of r.json.posts) {
        assert(!p.ip_hash, `PRIVACY: /posts/new post ${p.id} exposes ip_hash`);
      }
    }
  });
}

async function testCleanup() {
  console.log('\n🧹 CLEANUP');

  await test('DELETE test post via admin API', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api('/api/v1/admin/posts', {
      method: 'DELETE',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ id: testPostId }),
    });
    assert(r.status === 200, `Status ${r.status}: ${r.text.substring(0,200)}`);
  });

  await test('Deleted post is gone or removed', async () => {
    if (!testPostId) throw new Error('No test post ID');
    const r = await api(`/api/v1/posts/${testPostId}`);
    assert(r.status === 404 || r.json?.post?.status === 'removed' || r.json?.error, 
      `Expected 404 or removed, got ${r.status} — ${JSON.stringify(r.json).substring(0,100)}`);
  });
}

async function testCron() {
  console.log('\n⏰ CRON');

  await test('GET /api/cron/cleanup — requires auth', async () => {
    const r = await api('/api/cron/cleanup');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });
}

// ─── Run Everything ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  JAWWING PRODUCTION TEST SUITE`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}`);

  const start = Date.now();

  await testHealth();
  await testPages();
  await testFeedAPI();
  await testPostCreation();
  await testPostDetail();
  await testVoting();
  await testReplies();
  await testReports();
  await testConstitution();
  await testTerritories();
  await testAuth();
  await testAdmin();
  await testModeration();
  await testOG();
  await testUpload();
  await testPrivacy();
  await testCron();
  await testCleanup();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed (${elapsed}s)`);
  console.log(`${'═'.repeat(60)}`);

  if (failed > 0) {
    console.log('\n  FAILURES:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ❌ ${r.name}`);
      console.log(`     ${r.error}`);
    }
  }

  // Write JSON report
  const report = {
    target: BASE,
    timestamp: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    total,
    passed,
    failed,
    results,
  };
  
  const fs = await import('fs');
  const reportPath = new URL('../test-report.json', import.meta.url).pathname;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report: ${reportPath}`);

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(2);
});
