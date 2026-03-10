"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import FeedTabs, { SortTab } from "@/components/FeedTabs";
import PostCard, { Post as PostCardPost } from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import { ToastProvider } from "@/components/Toast";
import { fetchPosts, fetchNewPosts, createPost, getTerritoryFeed, type Post } from "@/lib/api";
import { requestLocation, reverseGeocode } from "@/lib/location";
import { formatTimeAgo, formatDistance } from "@/lib/api";
import { type TerritorySelection } from "@/components/TerritorySelector";
import { useAuth } from "@/lib/auth";

const HEADER_HEIGHT = 56; // px — keep in sync with Header component

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const LIMIT = 20;
const POLL_INTERVAL_MS = 30_000;
const WELCOME_DISMISSED_KEY = "jawwing_welcome_dismissed";

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
    reply_count: post.reply_count,
    timeAgo: formatTimeAgo(post.created_at),
    distance:
      userLat != null && userLng != null
        ? formatDistance(userLat, userLng, post.lat, post.lng)
        : undefined,
    created_at: post.created_at,
    expires_at: post.expires_at,
    territoryName,
  };
}

export default function FeedPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<SortTab>("hot");
  const [showModal, setShowModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState<string | null>(null); // "vote" | "post" | null

  // Mobile detection — snap scroll on <640px
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const snapContainerRef = useRef<HTMLDivElement | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Welcome card
  const [welcomeDismissed, setWelcomeDismissed] = useState(true); // start hidden, load from LS
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (!dismissed) setWelcomeDismissed(false);
    } catch { /* noop */ }
  }, []);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, "1"); } catch { /* noop */ }
  };

  // New posts polling state
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const latestTimestampRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DC Metro fallback
  const DC_LAT = 38.9072;
  const DC_LNG = -77.0369;

  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [locationLabel, setLocationLabel] = useState("Getting location...");
  const [locationError, setLocationError] = useState(false);
  const [locationFallback, setLocationFallback] = useState(false);

  const [selectedTerritory, setSelectedTerritory] = useState<TerritorySelection>({
    type: "near_me",
  });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);

  // Get location on mount — 5s timeout, fall back to DC Metro
  useEffect(() => {
    let cancelled = false;

    const fallbackToDC = () => {
      if (cancelled) return;
      setLocationError(true);
      setLocationFallback(true);
      setUserLat(DC_LAT);
      setUserLng(DC_LNG);
      setLocationLabel("DC Metro");
    };

    const timeoutId = setTimeout(fallbackToDC, 5_000);

    requestLocation()
      .then(async ({ lat, lng }) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setUserLat(lat);
        setUserLng(lng);
        const label = await reverseGeocode(lat, lng);
        if (!cancelled) setLocationLabel(label);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        fallbackToDC();
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRemoteTerritory = selectedTerritory.type === "territory";

  // Load feed
  const loadFeed = useCallback(
    async (reset = false) => {
      if (selectedTerritory.type === "near_me") {
        if (userLat == null || userLng == null) return;
      }

      if (reset) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
        setError(null);
        setNewPosts([]);
        setShowNewBanner(false);
      } else {
        setLoadingMore(true);
      }

      try {
        const currentOffset = reset ? 0 : offset;

        let fetchedPosts: Post[];
        if (selectedTerritory.type === "territory") {
          const data = await getTerritoryFeed(
            selectedTerritory.territory.id,
            activeTab as "hot" | "new" | "top",
            LIMIT,
            currentOffset
          );
          fetchedPosts = data.posts;
        } else {
          const data = await fetchPosts(
            userLat!,
            userLng!,
            activeTab as "hot" | "new" | "top",
            LIMIT,
            currentOffset
          );
          fetchedPosts = data.posts;
        }

        if (reset) {
          setPosts(fetchedPosts);
          if (fetchedPosts.length > 0) {
            latestTimestampRef.current = Math.max(...fetchedPosts.map((p) => p.created_at));
          }
        } else {
          setPosts((prev) => [...prev, ...fetchedPosts]);
        }
        setOffset(currentOffset + fetchedPosts.length);
        setHasMore(fetchedPosts.length === LIMIT);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLat, userLng, activeTab, offset, locationError, selectedTerritory]
  );

  useEffect(() => {
    if (selectedTerritory.type === "territory") {
      loadFeed(true);
    } else if (userLat != null && userLng != null) {
      loadFeed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng, activeTab, selectedTerritory]);

  // Poll for new posts
  const pollForNew = useCallback(async () => {
    if (userLat == null || userLng == null) return;
    if (latestTimestampRef.current === 0) return;
    if (selectedTerritory.type !== "near_me") return;
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
    } catch {
      // Silent
    }
  }, [userLat, userLng, activeTab, selectedTerritory]);

  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (userLat != null && userLng != null && !loading) {
      pollTimerRef.current = setInterval(pollForNew, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [userLat, userLng, loading, pollForNew]);

  const handleShowNewPosts = () => {
    if (newPosts.length === 0) return;
    latestTimestampRef.current = Math.max(
      latestTimestampRef.current,
      ...newPosts.map((p) => p.created_at)
    );
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = newPosts.filter((p) => !existingIds.has(p.id));
      return [...toAdd, ...prev];
    });
    setNewPosts([]);
    setShowNewBanner(false);
  };

  // Infinite scroll (desktop)
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

  // Mobile snap: infinite scroll via last item sentinel
  useEffect(() => {
    if (!isMobile || !mobileLoadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadFeed(false);
        }
      },
      {
        root: snapContainerRef.current,
        threshold: 0.1,
      }
    );
    observer.observe(mobileLoadMoreRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loadingMore, loading, loadFeed, posts.length]);

  const handleTabChange = (tab: SortTab) => {
    setActiveTab(tab);
  };

  const handleCreatePost = async (content: string, imageUrl?: string) => {
    if (!isAuthenticated) {
      setShowLoginPrompt("post");
      throw new Error("Login required");
    }
    if (userLat == null || userLng == null) {
      throw new Error("Location required to post.");
    }
    await createPost(content, userLat, userLng, imageUrl);
    loadFeed(true);
  };

  const handleFabClick = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt("post");
      return;
    }
    if (isRemoteTerritory) return;
    setShowModal(true);
  };

  const territoryName =
    selectedTerritory.type === "territory"
      ? selectedTerritory.territory.name
      : undefined;

  return (
    <ToastProvider>
      <div style={{ background: "#000000", minHeight: "100vh" }}>
        <Header
          location={locationLabel}
          userLat={userLat}
          userLng={userLng}
          selectedTerritory={selectedTerritory}
          onTerritoryChange={setSelectedTerritory}
          user={user ? { displayName: user.displayName } : null}
        />

        {/* Anonymous browsing banner — shown when not logged in */}
        {!isAuthenticated && (
          <div
            style={{
              background: "#000000",
              borderBottom: "1px solid #1F1F1F",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.1em" }}>
              JAWWING · ANONYMOUS LOCAL POSTS
            </span>
            <Link
              href="/login"
              style={{
                ...MONO,
                color: "#FFFFFF",
                fontSize: "0.625rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                border: "1px solid #333333",
                padding: "4px 10px",
                textDecoration: "none",
              }}
              className="hover:border-white transition-colors"
            >
              SIGN UP
            </Link>
          </div>
        )}

        {/* Login prompt banner — triggered by vote/post actions */}
        {showLoginPrompt && (
          <div
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              borderLeft: "2px solid #FFFFFF",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            <span style={{ ...MONO, color: "#C0C0C0", fontSize: "0.75rem", letterSpacing: "0.04em" }}>
              {showLoginPrompt === "vote" ? "SIGN UP TO VOTE" : "SIGN UP TO POST"}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  ...MONO,
                  background: "#FFFFFF",
                  color: "#000000",
                  border: "none",
                  padding: "6px 14px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                SIGN UP
              </button>
              <button
                onClick={() => setShowLoginPrompt(null)}
                style={{
                  ...MONO,
                  background: "none",
                  color: "#777777",
                  border: "none",
                  padding: "6px",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Location fallback banner */}
        {locationFallback && !isRemoteTerritory && (
          <div
            style={{
              background: "#1A1200",
              border: "1px solid #3D2E00",
              borderLeft: "3px solid #F5A500",
              padding: "10px 16px",
              maxWidth: "480px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "0.875rem", lineHeight: "1" }}>⚠</span>
            <span style={{ ...MONO, color: "#F5A500", fontSize: "0.6875rem", letterSpacing: "0.06em" }}>
              LOCATION UNAVAILABLE · SHOWING DC METRO
            </span>
          </div>
        )}

        {/* GPS-lock banner */}
        {isRemoteTerritory && (
          <div
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              borderLeft: "2px solid #333333",
              padding: "10px 16px",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            <span style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em" }}>
              YOU CAN ONLY POST WHERE YOU ARE
            </span>
          </div>
        )}

        <main style={{ maxWidth: "480px" }} className="mx-auto">
          {/* Feed tabs + manual refresh button */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <FeedTabs active={activeTab} onChange={handleTabChange} />
            </div>
            <button
              onClick={() => loadFeed(true)}
              disabled={loading}
              style={{
                ...MONO,
                background: "none",
                color: loading ? "#333333" : "#777777",
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

          {/* Welcome card — first-time visitors */}
          {!welcomeDismissed && (
            <div
              style={{
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                borderLeft: "2px solid #FFFFFF",
                padding: "16px",
                margin: "2px 0",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <p style={{ ...MONO, color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "6px" }}>
                  WELCOME TO JAWWING
                </p>
                <p style={{ color: "#777777", fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: "10px" }}>
                  Anonymous, location-based posts. AI-moderated.
                </p>
                <Link
                  href="/about"
                  style={{ ...MONO, color: "#C0C0C0", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
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
                  color: "#555555",
                  fontSize: "0.875rem",
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

          {/* Error state */}
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

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div style={{ padding: "60px 16px", textAlign: "center" }}>
              <p style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "8px" }}>
                NO POSTS YET
              </p>
              <p style={{ color: "#777777", fontSize: "0.875rem" }}>
                {territoryName ? `Nothing in ${territoryName} yet.` : "Be the first to post in your area."}
              </p>
            </div>
          )}

          {/* Posts — desktop card list */}
          {!loading && !error && posts.length > 0 && !isMobile && (
            <div className="flex flex-col" style={{ gap: "2px", paddingTop: "2px" }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={toCardPost(post, userLat, userLng, territoryName)}
                  onLoginRequired={() => setShowLoginPrompt("vote")}
                  variant="card"
                />
              ))}
            </div>
          )}

          {/* Load more sentinel (desktop) */}
          {!isMobile && <div ref={loadMoreRef} style={{ height: "1px" }} />}

          {/* Loading more indicator (desktop) */}
          {!isMobile && loadingMore && (
            <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.08em", textAlign: "center", padding: "16px 0" }}>
              LOADING...
            </p>
          )}

          {/* End of feed (desktop) */}
          {!isMobile && !loading && !hasMore && posts.length > 0 && (
            <p
              style={{
                ...MONO,
                color: "#333333",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                textAlign: "center",
                padding: "40px 0 80px",
              }}
            >
              {territoryName
                ? `${territoryName.toUpperCase()} · TERRITORY`
                : "5 MILE RADIUS · ANONYMOUS"}
            </p>
          )}

          {/* Bottom padding for FAB (desktop) */}
          {!isMobile && <div style={{ height: "80px" }} />}
        </main>

        {/* ── Mobile snap scroll feed ───────────────────────────────────────── */}
        {isMobile && !loading && !error && posts.length > 0 && (
          <div
            ref={snapContainerRef}
            className="feed-scroll-container"
            style={{
              position: "fixed",
              top: `${HEADER_HEIGHT}px`,
              left: 0,
              right: 0,
              bottom: 0,
              scrollSnapType: "y mandatory",
              overflowY: "scroll",
              WebkitOverflowScrolling: "touch",
              zIndex: 10,
            } as React.CSSProperties}
          >
            {posts.map((post, i) => (
              <div
                key={post.id}

                className="feed-snap-item"
                style={{
                  scrollSnapAlign: "start",
                  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <PostCard
                  post={toCardPost(post, userLat, userLng, territoryName)}
                  onLoginRequired={() => setShowLoginPrompt("vote")}
                  variant="fullscreen"

                />
              </div>
            ))}

            {/* Mobile load more sentinel */}
            <div
              ref={mobileLoadMoreRef}
              style={{
                scrollSnapAlign: "start",
                height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000000",
              }}
            >
              {loadingMore ? (
                <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.1em" }}>
                  LOADING...
                </span>
              ) : !hasMore ? (
                <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
                  {territoryName ? `${territoryName.toUpperCase()} · TERRITORY` : "5 MILE RADIUS · ANONYMOUS"}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Mobile loading skeleton (fixed overlay) */}
        {isMobile && loading && (
          <div
            style={{
              position: "fixed",
              top: `${HEADER_HEIGHT}px`,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#000000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              zIndex: 10,
            }}
          >
            <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.1em" }}>
              LOADING...
            </span>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={handleFabClick}
          disabled={isAuthenticated && isRemoteTerritory}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "48px",
            height: "48px",
            background: (isAuthenticated && isRemoteTerritory) ? "#1F1F1F" : "#FFFFFF",
            color: (isAuthenticated && isRemoteTerritory) ? "#777777" : "#000000",
            border: (isAuthenticated && isRemoteTerritory) ? "1px solid #333333" : "none",
            fontSize: "1.5rem",
            lineHeight: 1,
            cursor: (isAuthenticated && isRemoteTerritory) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 300,
            zIndex: 30,
            transition: "background 150ms, color 150ms",
          } as React.CSSProperties}
          className={(isAuthenticated && isRemoteTerritory) ? "" : "hover:bg-[#C0C0C0]"}
          aria-label={
            !isAuthenticated
              ? "Sign up to post"
              : isRemoteTerritory
              ? "You can only post where you are"
              : "Create post"
          }
          title={
            !isAuthenticated
              ? "Sign up to post"
              : isRemoteTerritory
              ? "You can only post where you are"
              : undefined
          }
        >
          +
        </button>

        <CreatePostModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreatePost}
        />
      </div>
    </ToastProvider>
  );
}
