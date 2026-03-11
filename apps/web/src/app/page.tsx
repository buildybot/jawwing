"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import FeedTabs, { SortTab } from "@/components/FeedTabs";
import PostCard, { Post as PostCardPost } from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import InlineCompose from "@/components/InlineCompose";
import { ToastProvider } from "@/components/Toast";
import { fetchPosts, fetchNewPosts, createPost, type Post } from "@/lib/api";
import { requestLocation, reverseGeocode } from "@/lib/location";
import { formatTimeAgo, formatDistance } from "@/lib/api";
import { type TerritorySelection } from "@/components/TerritorySelector";
import Link from "next/link";
import AgeGate from "@/components/AgeGate";
import AppBanner from "@/components/AppBanner";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

const FEED_CACHE_KEY = "jawwing_feed_cache";
const FEED_SCOPE_KEY = "jawwing_feed_scope";
const CITY_SELECTION_KEY = "jawwing_city_selection";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const LIMIT = 50; // fetch more so client-side sort has enough to work with
const POLL_INTERVAL_MS = 30_000;
const WELCOME_DISMISSED_KEY = "jawwing_welcome_dismissed";

/** The three scope options for the feed */
type FeedScope = "local" | "metro" | "country";

const SCOPE_LABELS: Record<FeedScope, string> = {
  local: "LOCAL",
  metro: "METRO",
  country: "COUNTRY",
};

/** Distance-decay scale (km) per scope — larger = weaker distance preference */
const SCOPE_DISTANCE_SCALE: Record<FeedScope, number> = {
  local: 2,
  metro: 10,
  country: 100,
};

const HOT_GRAVITY_CLIENT = 1.2;
const SECONDS_PER_HOUR = 3600;

function wilsonScore(ups: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96;
  const p = ups / total;
  return (
    (p + (z * z) / (2 * total) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
}

function hotScore(score: number, createdAt: number, upvotes?: number, downvotes?: number): number {
  const ageHours = (Date.now() / 1000 - createdAt) / SECONDS_PER_HOUR;
  const ups = upvotes ?? 0;
  const downs = downvotes ?? 0;
  const total = ups + downs;
  if (total === 0) {
    // Legacy fallback
    return (score + 1) / Math.pow(ageHours + 2, HOT_GRAVITY_CLIENT);
  }
  const engagement = total;
  const controversy = Math.min(ups, downs) / Math.max(ups, downs);
  const wilson = wilsonScore(ups, total);
  const numerator = wilson + 0.3 * Math.log(1 + engagement) + 0.2 * controversy;
  return numerator / Math.pow(ageHours + 2, HOT_GRAVITY_CLIENT);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceBoost(distanceKm: number, scale: number): number {
  return 1 / Math.sqrt(1 + distanceKm / scale);
}

function sortPostsHot(rawPosts: Post[], userLat: number, userLng: number, scope: FeedScope): Post[] {
  const scale = SCOPE_DISTANCE_SCALE[scope];
  return [...rawPosts].sort((a, b) => {
    const distA = haversineKm(userLat, userLng, a.lat, a.lng);
    const distB = haversineKm(userLat, userLng, b.lat, b.lng);
    const rankA = hotScore(a.score, a.created_at, a.upvotes, a.downvotes) * distanceBoost(distA, scale);
    const rankB = hotScore(b.score, b.created_at, b.upvotes, b.downvotes) * distanceBoost(distB, scale);
    return rankB - rankA;
  });
}

// Default coords — DC Metro, shown immediately while GPS resolves
const DC_LAT = 38.9072;
const DC_LNG = -77.0369;

function toCardPost(
  post: Post,
  userLat?: number,
  userLng?: number,
  territoryName?: string
): PostCardPost {
  return {
    id: post.id,
    content: post.content,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    reply_count: post.reply_count,
    timeAgo: formatTimeAgo(post.created_at),
    distance:
      userLat != null && userLng != null
        ? formatDistance(userLat, userLng, post.lat, post.lng)
        : undefined,
    created_at: post.created_at,
    expires_at: post.expires_at,
    territoryName,
    user_id: post.user_id,
    metro: post.metro ?? null,
    image_url: post.image_url ?? null,
    mod_confidence: post.mod_confidence ?? null,
  };
}

export default function FeedPage() {
  const { isBlocked } = useBlockedUsers();
  const [activeTab, setActiveTab] = useState<SortTab>("hot");
  const [showModal, setShowModal] = useState(false);

  // Scope selector: LOCAL / METRO / COUNTRY
  const [feedScope, setFeedScope] = useState<FeedScope>("metro");
  // Track if scope was loaded from localStorage (to avoid flash)
  const [scopeReady, setScopeReady] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  // Whether server returned 0 posts on the initial scope before fallback
  const [expandedScope, setExpandedScope] = useState(false);
  const [expandedLabel, setExpandedLabel] = useState("");

  // Pull-to-refresh state
  const [ptrState, setPtrState] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle");
  const [ptrHeight, setPtrHeight] = useState(0);
  const touchStartYRef = useRef(0);
  const PTR_THRESHOLD = 72;

  // Load saved scope + city on mount
  useEffect(() => {
    try {
      const savedScope = localStorage.getItem(FEED_SCOPE_KEY) as FeedScope | null;
      if (savedScope && ["local", "metro", "country"].includes(savedScope)) {
        setFeedScope(savedScope);
      }
      // Restore saved city selection
      const savedCity = localStorage.getItem(CITY_SELECTION_KEY);
      if (savedCity) {
        const city = JSON.parse(savedCity);
        if (city && city.name && city.lat != null && city.lng != null) {
          setSelectedTerritory({ type: "city", city });
        }
      }
      // Show cached posts ONLY as a brief flash while real data loads (max 3 seconds)
      const cached = localStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        const parsed = (JSON.parse(cached) as Post[]).filter((p) => p.status === "active");
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
          // Clear stale cache after 3 seconds — real data should have arrived by then
          setTimeout(() => {
            try { localStorage.removeItem(FEED_CACHE_KEY); } catch { /* noop */ }
          }, 3000);
        }
      }
    } catch { /* noop */ }
    setScopeReady(true);
  }, []);

  // Welcome card
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  useEffect(() => {
    try {
      const isLoggedIn = document.cookie.includes("jw_account_ok=1");
      if (isLoggedIn) { setWelcomeDismissed(true); return; }
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (!dismissed) setWelcomeDismissed(false);
    } catch { /* noop */ }
  }, []);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, "1"); } catch { /* noop */ }
  };

  // New posts polling
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const latestTimestampRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Location — start with DC Metro immediately, refine with GPS async
  const [userLat, setUserLat] = useState<number>(DC_LAT);
  const [userLng, setUserLng] = useState<number>(DC_LNG);
  const [locationLabel, setLocationLabel] = useState("DC Metro");
  const [locationRefined, setLocationRefined] = useState(false);
  const [locationFallback, setLocationFallback] = useState(false);

  const [selectedTerritory, setSelectedTerritory] = useState<TerritorySelection>({ type: "near_me" });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Scroll-to-top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track post ids for fade-in animation (new posts prepended)
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const prevPostIdsRef = useRef<Set<string>>(new Set());

  // Request real GPS in background — update coords when available
  useEffect(() => {
    let cancelled = false;
    requestLocation()
      .then(async ({ lat, lng }) => {
        if (cancelled) return;
        setUserLat(lat);
        setUserLng(lng);
        setLocationRefined(true);
        const label = await reverseGeocode(lat, lng);
        if (!cancelled) setLocationLabel(label);
      })
      .catch(() => {
        if (!cancelled) setLocationFallback(true);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRemoteTerritory = selectedTerritory.type === "city";

  // Load feed
  const loadFeed = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
        setError(null);
        setNewPosts([]);
        setShowNewBanner(false);
        setExpandedScope(false);
        setExpandedLabel("");
      } else {
        setLoadingMore(true);
      }

      try {
        const currentOffset = reset ? 0 : offset;
        let fetchedPosts: Post[];

        // Determine feed coordinates — remote city center or user GPS
        const feedLat = isRemoteTerritory ? selectedTerritory.city.lat : userLat;
        const feedLng = isRemoteTerritory ? selectedTerritory.city.lng : userLng;

        // Scope determines API mode for both local and remote browsing
        let apiMode: "auto" | "radius" | "territory" | "everywhere" = "auto";
        let radiusMeters: number | undefined;

        if (feedScope === "local") {
          apiMode = "radius";
          radiusMeters = 5000; // 5km neighborhood
        } else if (feedScope === "metro") {
          if (isRemoteTerritory) {
            // Remote city: use 30km radius around city center (no H3 territory)
            apiMode = "radius";
            radiusMeters = 30000;
          } else {
            apiMode = "territory"; // Local: use H3 hex territory
          }
        } else {
          apiMode = "everywhere";
        }

        const data = await fetchPosts(
          feedLat,
          feedLng,
          activeTab as "hot" | "new" | "top",
          LIMIT,
          currentOffset,
          apiMode,
          radiusMeters
        );
        fetchedPosts = data.posts;

        // Auto-expand: LOCAL only expands within local radii (never jumps to metro/country).
        // METRO and COUNTRY never auto-expand — they show exactly what's in that scope.
        const MIN_POSTS = 5;
        if (reset && fetchedPosts.length < MIN_POSTS && feedScope === "local") {
          const expansionSteps: Array<{ mode: "radius"; radius: number; label: string }> = [
            { mode: "radius", radius: 10000, label: "10KM" },
            { mode: "radius", radius: 20000, label: "20KM" },
          ];

          for (const step of expansionSteps) {
            if (fetchedPosts.length >= MIN_POSTS) break;
            const fallback = await fetchPosts(
              feedLat, feedLng, activeTab as "hot" | "new" | "top", LIMIT, 0, step.mode, step.radius
            );
            if (fallback.posts.length > fetchedPosts.length) {
              fetchedPosts = fallback.posts;
              setExpandedScope(true);
              setExpandedLabel(step.label);
            }
          }
        }

        // Smart default: if first load (reset) on metro/local returns very few posts,
        // auto-switch to COUNTRY so users always see a full feed on arrival.
        // Only triggers if user hasn't manually saved a scope preference.
        const savedPref = typeof window !== "undefined" && localStorage.getItem(FEED_SCOPE_KEY);
        if (reset && !savedPref && feedScope !== "country" && fetchedPosts.length < 3) {
          const countryData = await fetchPosts(feedLat, feedLng, activeTab as "hot" | "new" | "top", LIMIT, 0, "everywhere");
          if (countryData.posts.length > fetchedPosts.length) {
            fetchedPosts = countryData.posts;
            setFeedScope("country");
          }
        }

        // Client-side distance-boosted sort for HOT tab
        if (activeTab === "hot") {
          fetchedPosts = sortPostsHot(fetchedPosts, feedLat, feedLng, feedScope);
        }

        if (reset) {
          setPosts(fetchedPosts);
          if (fetchedPosts.length > 0) {
            latestTimestampRef.current = Math.max(...fetchedPosts.map((p) => p.created_at));
            try { localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(fetchedPosts)); } catch { /* noop */ }
          }
        } else {
          setPosts((prev) => [...prev, ...fetchedPosts]);
        }
        setOffset(currentOffset + fetchedPosts.length);
        setHasMore(fetchedPosts.length === LIMIT);
      } catch (err) {
        const isOffline = !navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch"));
        setError(isOffline ? "CAN'T CONNECT · CHECK YOUR CONNECTION" : "COULDN'T LOAD POSTS · TAP TO RETRY");
        // Clear stale cache on error so next reload fetches fresh
        try { localStorage.removeItem(FEED_CACHE_KEY); } catch { /* noop */ }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLat, userLng, activeTab, offset, selectedTerritory, feedScope]
  );

  // Load on mount + when tab/territory/scope changes (wait until scope is hydrated from localStorage)
  useEffect(() => {
    if (!scopeReady) return;
    loadFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTerritory, feedScope, scopeReady]);

  // Reload with refined coords when GPS comes in
  useEffect(() => {
    if (locationRefined) {
      loadFeed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRefined]);

  // Poll for new posts
  const pollForNew = useCallback(async () => {
    if (latestTimestampRef.current === 0) return;
    if (selectedTerritory.type === "city") return;
    if (activeTab === "top") return;

    try {
      const data = await fetchNewPosts(userLat, userLng, latestTimestampRef.current);
      if (data.posts.length > 0) {
        setNewPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = data.posts.filter((p) => !existingIds.has(p.id));
          return [...fresh, ...prev];
        });
        setShowNewBanner(true);
      }
    } catch { /* silent */ }
  }, [userLat, userLng, activeTab, selectedTerritory]);

  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!loading) {
      pollTimerRef.current = setInterval(pollForNew, POLL_INTERVAL_MS);
    }
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [loading, pollForNew]);

  const handleShowNewPosts = () => {
    if (newPosts.length === 0) return;
    latestTimestampRef.current = Math.max(
      latestTimestampRef.current,
      ...newPosts.map((p) => p.created_at)
    );
    const toAddIds = new Set(newPosts.map((p) => p.id));
    setAnimatedIds((prev) => new Set([...prev, ...toAddIds]));
    // Remove from animated set after animation completes
    setTimeout(() => {
      setAnimatedIds((prev) => {
        const next = new Set(prev);
        toAddIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 400);
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = newPosts.filter((p) => !existingIds.has(p.id));
      return [...toAdd, ...prev];
    });
    setNewPosts([]);
    setShowNewBanner(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadFeed(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadFeed]);

  const handleCreatePost = async (content: string, _imageUrl?: string) => {
    if (userLat == null || userLng == null) {
      throw new Error("Location required to post.");
    }
    await createPost(content, userLat, userLng);
    loadFeed(true);
  };

  const handleFabClick = () => {
    if (isRemoteTerritory) return;
    setShowModal(true);
  };

  // ── Pull-to-refresh handlers ──────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY !== 0 || loading) return;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    if (dy <= 0) return;
    const h = Math.min(dy * 0.5, PTR_THRESHOLD + 20);
    setPtrHeight(h);
    setPtrState(h >= PTR_THRESHOLD * 0.5 ? (dy > PTR_THRESHOLD ? "ready" : "pulling") : "idle");
  };

  const handleTouchEnd = () => {
    if (ptrState === "ready") {
      setPtrState("refreshing");
      setPtrHeight(40);
      loadFeed(true).finally(() => {
        setPtrState("idle");
        setPtrHeight(0);
      });
    } else {
      setPtrState("idle");
      setPtrHeight(0);
    }
  };

  const territoryName =
    selectedTerritory.type === "city"
      ? selectedTerritory.city.name
      : undefined;

  return (
    <AgeGate>
    <ToastProvider>
      <div
        style={{ background: "#000000", minHeight: "100vh" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AppBanner />
        {/* Pull-to-refresh indicator */}
        {ptrState !== "idle" && (
          <div
            className="ptr-indicator"
            style={{ height: ptrHeight, opacity: ptrHeight > 10 ? 1 : 0 }}
          >
            <span className={`ptr-arrow${ptrState === "ready" ? " ready" : ptrState === "refreshing" ? " spinning" : ""}`}>↻</span>
            <span>{ptrState === "ready" ? "RELEASE TO REFRESH" : ptrState === "refreshing" ? "REFRESHING..." : "PULL TO REFRESH"}</span>
          </div>
        )}
        <Header
          location={locationLabel}
          userLat={userLat}
          userLng={userLng}
          selectedTerritory={selectedTerritory}
          onTerritoryChange={setSelectedTerritory}
        />

        {/* Location fallback — subtle, not alarming */}
        {locationFallback && !isRemoteTerritory && (
          <div
            style={{
              padding: "6px 16px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            className="feed-container"
          >
            <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
              DC METRO
            </span>
            <span style={{ color: "#333333", fontSize: "0.625rem" }}>·</span>
            <button
              onClick={() => window.location.reload()}
              style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              ENABLE LOCATION FOR YOUR AREA
            </button>
          </div>
        )}

        {/* GPS-lock banner for remote territories */}
        {isRemoteTerritory && (
          <div
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              borderLeft: "2px solid #333333",
              padding: "10px 16px",
              margin: "0 auto",
            }}
            className="feed-container"
          >
            <span style={{ ...MONO, color: "#AAAAAA", fontSize: "0.6875rem", letterSpacing: "0.06em" }}>
              YOU CAN ONLY POST WHERE YOU ARE
            </span>
          </div>
        )}

        <main className="feed-container mx-auto">
          {/* Feed tabs + refresh */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <FeedTabs active={activeTab} onChange={setActiveTab} />
            </div>
            <button
              onClick={() => loadFeed(true)}
              disabled={loading}
              style={{
                ...MONO,
                background: "none",
                color: loading ? "#333333" : "#AAAAAA",
                border: "none",
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                padding: "8px 12px",
                lineHeight: 1,
                transition: "color 150ms",
                flexShrink: 0,
              }}
              className="hover:text-[#C0C0C0]"
              aria-label="Refresh feed"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Scope selector */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "8px 16px",
              borderBottom: "1px solid #1A1A1A",
            }}
          >
            {(["local", "metro", "country"] as FeedScope[]).map((scope) => {
              const active = feedScope === scope && !isRemoteTerritory;
              const disabled = isRemoteTerritory && scope === "local";
              return (
                <button
                  key={scope}
                  onClick={() => {
                    if (disabled) return;
                    setFeedScope(scope);
                    try { localStorage.setItem(FEED_SCOPE_KEY, scope); } catch { /* noop */ }
                  }}
                  disabled={disabled}
                  style={{
                    ...MONO,
                    background: active ? "#FFFFFF" : "transparent",
                    color: disabled ? "#2A2A2A" : active ? "#000000" : "#888888",
                    border: `1px solid ${active ? "#FFFFFF" : disabled ? "#1A1A1A" : "#2A2A2A"}`,
                    padding: "4px 10px",
                    fontSize: "0.625rem",
                    fontWeight: active ? 700 : 400,
                    letterSpacing: "0.08em",
                    cursor: disabled ? "not-allowed" : "pointer",
                    borderRadius: "2px",
                    transition: "all 150ms",
                    lineHeight: 1.4,
                  }}
                  title={disabled ? "LOCAL not available for remote cities" : undefined}
                >
                  {SCOPE_LABELS[scope]}
                </button>
              );
            })}
            {!isRemoteTerritory && expandedScope && (
              <span style={{ ...MONO, color: "#888888", fontSize: "0.5625rem", letterSpacing: "0.06em", alignSelf: "center", marginLeft: "4px" }}>
                EXPANDED TO {expandedLabel}
              </span>
            )}
          </div>

          {/* Territory header */}
          {territoryName && (
            <div
              style={{
                ...MONO,
                padding: "8px 16px",
                borderBottom: "1px solid #1F1F1F",
                color: "#333333",
                fontSize: "0.6875rem",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{territoryName.toUpperCase()}</span>
              <span style={{ color: "#1F1F1F" }}>TERRITORY</span>
            </div>
          )}

          {/* Inline compose bar */}
          {!isRemoteTerritory && (
            <InlineCompose
              locationLabel={locationLabel}
              hasLocation={locationRefined}
              onSubmit={handleCreatePost}
            />
          )}

          {/* Welcome card */}
          {!welcomeDismissed && (
            <div
              style={{
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                borderLeft: "3px solid #FFFFFF",
                padding: "20px 16px",
                margin: "2px 0",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <p style={{ ...MONO, color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "10px", lineHeight: 1.2 }}>
                  YOUR NEIGHBORHOOD<br />IS TALKING
                </p>
                <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "6px" }}>
                  Anonymous posts from people near you. No accounts. No names. Just 300 characters and an opinion.
                </p>
                <p style={{ color: "#AAAAAA", fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: "14px" }}>
                  Posts expire in 48 hours. What happens here, stays here.
                </p>
                <Link
                  href="/settings"
                  style={{ ...MONO, color: "#AAAAAA", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
                  className="hover:text-white transition-colors"
                >
                  LEARN MORE →
                </Link>
              </div>
              <button
                onClick={dismissWelcome}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888888",
                  fontSize: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                  lineHeight: 1,
                }}
                className="hover:text-[#C0C0C0] transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* New posts banner */}
          {showNewBanner && newPosts.length > 0 && (
            <button
              onClick={handleShowNewPosts}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: "#FFFFFF",
                color: "#000000",
                border: "none",
                padding: "10px 16px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textAlign: "center",
                transition: "background 150ms",
              }}
              className="hover:bg-[#E0E0E0]"
            >
              ↑ {newPosts.length} NEW {newPosts.length === 1 ? "POST" : "POSTS"}
            </button>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col" style={{ gap: "2px", paddingTop: "2px" }}>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1F1F1F",
                    padding: "16px",
                    height: "100px",
                  }}
                >
                  <div style={{ background: "#1F1F1F", height: "12px", marginBottom: "8px", width: `${70 + i * 5}%` }} />
                  <div style={{ background: "#1F1F1F", height: "12px", marginBottom: "8px", width: "90%" }} />
                  <div style={{ background: "#1F1F1F", height: "12px", width: "60%" }} />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: "16px" }}>
                {error.toUpperCase()}
              </p>
              <button
                onClick={() => loadFeed(true)}
                style={{
                  ...MONO,
                  background: "transparent",
                  color: "#C0C0C0",
                  border: "1px solid #333333",
                  padding: "8px 20px",
                  fontSize: "0.75rem",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                RETRY
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && posts.length === 0 && (
            <div style={{ padding: "60px 16px", textAlign: "center" }}>
              <p style={{ ...MONO, color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "10px" }}>
                {feedScope === "local" ? "NOTHING NEARBY" : feedScope === "metro" ? "NOTHING IN THIS METRO" : "NOTHING HERE YET"}
              </p>
              <p style={{ color: "#AAAAAA", fontSize: "0.875rem", marginBottom: "8px" }}>
                {feedScope === "local"
                  ? "No posts within 20km. Be the first to say something."
                  : feedScope === "metro"
                  ? `No posts in ${territoryName || "this metro"} yet. Start the conversation.`
                  : "Be the first to post."}
              </p>
              {feedScope === "local" && (
                <p style={{ ...MONO, color: "#555", fontSize: "0.6875rem", letterSpacing: "0.06em", marginBottom: "20px" }}>
                  TRY <button onClick={() => setFeedScope("metro")} style={{ ...MONO, background: "none", border: "none", color: "#AAAAAA", fontSize: "0.6875rem", letterSpacing: "0.06em", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", padding: 0 }}>METRO</button> OR <button onClick={() => setFeedScope("country")} style={{ ...MONO, background: "none", border: "none", color: "#AAAAAA", fontSize: "0.6875rem", letterSpacing: "0.06em", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", padding: 0 }}>COUNTRY</button> FOR MORE
                </p>
              )}
              {!isRemoteTerritory && (
                <button
                  onClick={handleFabClick}
                  style={{
                    background: "#FFFFFF",
                    color: "#000000",
                    border: "none",
                    width: "56px",
                    height: "56px",
                    fontSize: "1.75rem",
                    fontWeight: 300,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 150ms",
                    borderRadius: "2px",
                  } as React.CSSProperties}
                  className="hover:bg-[#C0C0C0]"
                  aria-label="Create post"
                >
                  +
                </button>
              )}
            </div>
          )}

          {/* Posts */}
          {!loading && !error && posts.length > 0 && (
            <div className="flex flex-col" style={{ gap: "2px", paddingTop: "2px" }}>
              {posts
                .filter((post) => !post.user_id || !isBlocked(post.user_id))
                .map((post) => (
                  <div
                    key={post.id}
                    style={animatedIds.has(post.id) ? {
                      animation: "fadeInDown 200ms ease forwards",
                    } : undefined}
                  >
                    <PostCard
                      post={toCardPost(post, userLat, userLng, territoryName)}
                      feedScope={feedScope}
                    />
                  </div>
                ))}
            </div>
          )}

          <div ref={loadMoreRef} style={{ height: "1px" }} />

          {loadingMore && (
            <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.08em", textAlign: "center", padding: "16px 0" }}>
              LOADING...
            </p>
          )}

          {!loading && !hasMore && posts.length > 0 && (
            <p style={{ ...MONO, color: "#333333", fontSize: "0.6875rem", letterSpacing: "0.06em", textAlign: "center", padding: "40px 0 80px" }}>
              {territoryName
                ? `${territoryName.toUpperCase()} · TERRITORY`
                : feedScope === "local"
                  ? "LOCAL · 5KM RADIUS"
                  : feedScope === "metro"
                    ? "DC METRO · TERRITORY"
                    : "EVERYWHERE · ALL POSTS"}
            </p>
          )}

          {/* Algorithm & Info Footer */}
          <div style={{
            borderTop: "1px solid #1A1A1A",
            margin: "40px 0 0",
            padding: "32px 16px 24px",
          }}>
            {/* Algorithm explainer */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{
                ...MONO,
                color: "#555555",
                fontSize: "0.625rem",
                letterSpacing: "0.12em",
                fontWeight: 700,
                marginBottom: "16px",
              }}>
                HOW THE FEED WORKS
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Sort modes */}
                <div>
                  <h4 style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>
                    SORT
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>HOT </span>
                      Ranks posts by a combination of votes, engagement, and freshness. Newer posts with more activity rise to the top. Posts closer to you get a small boost. Controversial posts (lots of both upvotes and downvotes) surface higher than buried ones.
                    </p>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>NEW </span>
                      Most recent posts first. No ranking, no algorithm. Pure chronological order.
                    </p>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>TOP </span>
                      Sorted by total engagement (upvotes + downvotes combined). The most interacted-with posts rise to the top, regardless of whether people agreed or not.
                    </p>
                  </div>
                </div>

                {/* Scope modes */}
                <div>
                  <h4 style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>
                    SCOPE
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>LOCAL </span>
                      Posts within 5-20km of you. Your immediate neighborhood. If few posts are nearby, try METRO for the full city.
                    </p>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>METRO </span>
                      All posts in your metro area (about a 20-mile radius around the city center). See what your whole city is talking about.
                    </p>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>COUNTRY </span>
                      Every post, everywhere. Browse what people across all cities are posting. Posts closer to you still rank slightly higher in HOT mode.
                    </p>
                  </div>
                </div>

                {/* Key details */}
                <div>
                  <h4 style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>
                    KEY DETAILS
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p style={{ color: "#555555", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                      All posts expire after 48 hours. You can only post from your current GPS location, but you can browse and vote from anywhere. Content is moderated by AI agents following our public Constitution. No humans moderate this app.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ ...MONO, color: "#333333", fontSize: "0.5625rem", letterSpacing: "0.06em" }}>
              JAWWING · 2026
            </p>
          </div>

          <div style={{ height: "80px" }} />
        </main>

        {/* FAB — subtle secondary CTA (inline compose is primary) */}
        {!isRemoteTerritory && (
          <button
            onClick={handleFabClick}
            style={{
              position: "fixed",
              bottom: "calc(24px + env(safe-area-inset-bottom))",
              right: "24px",
              width: "40px",
              height: "40px",
              background: "#000000",
              color: "#888888",
              border: "1px solid #333333",
              fontSize: "1.25rem",
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 300,
              zIndex: 30,
              transition: "border-color 150ms, color 150ms",
              borderRadius: "2px",
            } as React.CSSProperties}
            className="hover:border-[#AAA] hover:text-[#C0C0C0]"
            aria-label="Create post"
          >
            +
          </button>
        )}

        <CreatePostModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreatePost}
        />

        {/* Scroll to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            width: "36px",
            height: "36px",
            background: "#000000",
            color: "#FFFFFF",
            border: "1px solid #333333",
            fontSize: "1rem",
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            opacity: showScrollTop ? 1 : 0,
            pointerEvents: showScrollTop ? "auto" : "none",
            transition: "opacity 200ms ease",
            borderRadius: "2px",
            ...MONO,
          } as React.CSSProperties}
          aria-label="Scroll to top"
          title="Back to top"
        >
          ↑
        </button>
      </div>
    </ToastProvider>
    </AgeGate>
  );
}
