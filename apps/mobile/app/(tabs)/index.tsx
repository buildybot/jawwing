import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { AgeGate } from '../../components/AgeGate';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { getPosts, getTerritories, getTerritoryFeed, Post, Territory } from '../../lib/api';
import { getLocationInfo, requestLocationPermission, LocationInfo } from '../../lib/location';
import { getBlockedUsers, blockUser, invalidateBlockedCache } from '../../lib/blocked';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'hot' | 'new' | 'top';
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'hot', label: 'HOT' },
  { key: 'new', label: 'NEW' },
  { key: 'top', label: 'TOP' },
];

type FeedScope = 'local' | 'metro' | 'country';
const SCOPE_OPTIONS: { key: FeedScope; label: string }[] = [
  { key: 'local', label: 'LOCAL' },
  { key: 'metro', label: 'METRO' },
  { key: 'country', label: 'COUNTRY' },
];

const SCOPE_DISTANCE_SCALE: Record<FeedScope, number> = {
  local: 2,
  metro: 10,
  country: 100,
};

type TerritoryMode =
  | { type: 'near_me' }
  | { type: 'territory'; territory: Territory };

const PAGE_SIZE = 50; // fetch more so client-side sort has material
const FEED_SCOPE_KEY = 'jawwing_feed_scope';
const MIN_POSTS = 10;

// ─── Algorithms ───────────────────────────────────────────────────────────────

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

function computeHotRank(post: Post, userLat: number, userLng: number, scale: number): number {
  const createdAtSec = post.created_at ?? new Date(post.createdAt).getTime() / 1000;
  const ageHours = (Date.now() / 1000 - createdAtSec) / 3600;
  const hs = (post.score + 1) / Math.pow(ageHours + 2, 1.8);
  const distKm =
    post.lat != null && post.lng != null
      ? haversineKm(userLat, userLng, post.lat, post.lng)
      : 0;
  const boost = 1 / Math.sqrt(1 + distKm / scale);
  return hs * boost;
}

function sortHot(posts: Post[], userLat: number, userLng: number, scope: FeedScope): Post[] {
  const scale = SCOPE_DISTANCE_SCALE[scope];
  return [...posts].sort(
    (a, b) =>
      computeHotRank(b, userLat, userLng, scale) -
      computeHotRank(a, userLat, userLng, scale)
  );
}

// DC Metro fallback coords
const DC_LAT = 38.9072;
const DC_LNG = -77.0369;

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sort, setSort] = useState<SortMode>('hot');
  const [feedScope, setFeedScope] = useState<FeedScope>('metro');
  const [scopeReady, setScopeReady] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [expandedScope, setExpandedScope] = useState(false);
  const [expandedLabel, setExpandedLabel] = useState('');

  // Blocked users
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  // Territory mode (territory selector)
  const [territoryMode, setTerritoryMode] = useState<TerritoryMode>({ type: 'near_me' });
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const isRemoteTerritory = territoryMode.type === 'territory';

  // Load scope preference from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(FEED_SCOPE_KEY);
        if (saved && ['local', 'metro', 'country'].includes(saved)) {
          setFeedScope(saved as FeedScope);
        }
      } catch { /* noop */ }
      setScopeReady(true);
    })();
  }, []);

  // Load location + request permission
  useEffect(() => {
    (async () => {
      await requestLocationPermission();
      const info = await getLocationInfo();
      setLocation(info);
    })();
  }, []);

  // Load territories
  useEffect(() => {
    setTerritoriesLoading(true);
    getTerritories()
      .then(setTerritories)
      .catch(() => {})
      .finally(() => setTerritoriesLoading(false));
  }, []);

  // Load blocked users
  useEffect(() => {
    getBlockedUsers().then(ids => setBlockedIds(new Set(ids)));
  }, []);

  const userLat = location?.lat ?? DC_LAT;
  const userLng = location?.lng ?? DC_LNG;

  // ─── Feed loading ──────────────────────────────────────────────────────────

  const loadPosts = useCallback(
    async (pageNum: number, currentSort: SortMode, refresh = false) => {
      try {
        let data: Post[];

        if (isRemoteTerritory && territoryMode.type === 'territory') {
          const offset = (pageNum - 1) * PAGE_SIZE;
          const result = await getTerritoryFeed(territoryMode.territory.id, {
            sort: currentSort,
            limit: PAGE_SIZE,
            offset,
          });
          data = result.posts;
        } else {
          // Scope → API mode
          let apiMode: 'auto' | 'radius' | 'territory' | 'everywhere' = 'territory';
          let radiusMeters: number | undefined;
          if (feedScope === 'local') {
            apiMode = 'radius';
            radiusMeters = 5000;
          } else if (feedScope === 'metro') {
            apiMode = 'territory';
          } else {
            apiMode = 'everywhere';
          }

          data = await getPosts({
            sort: currentSort,
            lat: userLat,
            lng: userLng,
            page: pageNum,
            limit: PAGE_SIZE,
            mode: apiMode,
            radiusMeters,
          });

          // Auto-expand if fewer than MIN_POSTS
          if (refresh || pageNum === 1) {
            setExpandedScope(false);
            setExpandedLabel('');

            if (data.length < MIN_POSTS) {
              type ExpStep = { mode: 'radius' | 'territory' | 'everywhere'; radius?: number; label: string };
              const steps: ExpStep[] = [];

              if (feedScope === 'local') {
                steps.push(
                  { mode: 'radius', radius: 10000, label: '10KM' },
                  { mode: 'radius', radius: 20000, label: '20KM' },
                  { mode: 'territory', label: 'DC METRO' },
                  { mode: 'everywhere', label: 'EVERYWHERE' },
                );
              } else if (feedScope === 'metro') {
                steps.push({ mode: 'everywhere', label: 'EVERYWHERE' });
              }

              for (const step of steps) {
                if (data.length >= MIN_POSTS) break;
                try {
                  const fallback = await getPosts({
                    sort: currentSort,
                    lat: userLat,
                    lng: userLng,
                    page: 1,
                    limit: PAGE_SIZE,
                    mode: step.mode,
                    radiusMeters: step.radius,
                  });
                  if (fallback.length > data.length) {
                    data = fallback;
                    setExpandedScope(true);
                    setExpandedLabel(step.label);
                  }
                } catch { /* continue */ }
              }
            }
          }
        }

        // Client-side HOT sort when in near_me mode
        if (currentSort === 'hot' && !isRemoteTerritory) {
          data = sortHot(data, userLat, userLng, feedScope);
        }

        if (refresh || pageNum === 1) {
          setPosts(data);
        } else {
          setPosts(prev => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // silent — show empty state
      }
    },
    [location, territoryMode, feedScope, isRemoteTerritory, userLat, userLng]
  );

  useEffect(() => {
    if (!scopeReady) return;
    setLoading(true);
    setPage(1);
    setHasMore(true);
    loadPosts(1, sort).finally(() => setLoading(false));
  }, [sort, location, territoryMode, feedScope, scopeReady]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(1, sort, true);
    setRefreshing(false);
  }, [sort, loadPosts]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPosts(page + 1, sort);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, sort, loadPosts]);

  const handleVoteChange = (postId: string, newScore: number, newVote: 1 | -1 | null) => {
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, score: newScore, userVote: newVote } : p))
    );
  };

  const handleBlock = useCallback(async (userId: string) => {
    await blockUser(userId);
    invalidateBlockedCache();
    setBlockedIds(prev => new Set([...prev, userId]));
  }, []);

  const handleScopeChange = async (scope: FeedScope) => {
    setFeedScope(scope);
    try {
      await AsyncStorage.setItem(FEED_SCOPE_KEY, scope);
    } catch { /* noop */ }
  };

  // Header label
  const currentLocationLabel =
    territoryMode.type === 'territory'
      ? territoryMode.territory.name.toUpperCase()
      : feedScope === 'local'
        ? 'NEAR ME'
        : feedScope === 'country'
          ? 'EVERYWHERE'
          : location?.displayName?.toUpperCase() ?? 'DC METRO';

  const handleTerritorySelect = (t: Territory) => {
    setTerritoryMode({ type: 'territory', territory: t });
    setSelectorOpen(false);
  };

  const handleSelectNearMe = () => {
    setTerritoryMode({ type: 'near_me' });
    setSelectorOpen(false);
  };

  const visiblePosts = posts.filter(
    p => !blockedIds.has(p.user_id ?? p.authorId ?? '')
  );

  return (
    <AgeGate>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.headerWrapper}>
          <Text style={styles.logo}>JAWWING</Text>
          <TouchableOpacity
            onPress={() => setSelectorOpen(true)}
            style={styles.locationButton}
            activeOpacity={0.7}
          >
            <Text style={styles.locationText} numberOfLines={1}>
              {currentLocationLabel}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* GPS-lock banner */}
        {isRemoteTerritory && (
          <View style={styles.gpsLockBanner}>
            <Text style={styles.gpsLockText}>YOU CAN ONLY POST WHERE YOU ARE</Text>
          </View>
        )}

        {/* Sort tabs */}
        <View style={styles.sortBar}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortTab, sort === opt.key && styles.sortTabActive]}
              onPress={() => setSort(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortLabel, sort === opt.key && styles.sortLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scope selector (only in near_me mode) */}
        {!isRemoteTerritory && (
          <View style={styles.scopeBar}>
            {SCOPE_OPTIONS.map(opt => {
              const active = feedScope === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.scopePill, active && styles.scopePillActive]}
                  onPress={() => handleScopeChange(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.scopeLabel, active && styles.scopeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {expandedScope && (
              <Text style={styles.expandedLabel}>
                NO POSTS NEARBY · SHOWING {expandedLabel || 'DC METRO'}
              </Text>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : (
          <FlatList
            data={visiblePosts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onVoteChange={handleVoteChange}
                onPress={post => router.push(`/post/${post.id}`)}
                onBlock={handleBlock}
                territoryName={
                  territoryMode.type === 'territory'
                    ? territoryMode.territory.name
                    : undefined
                }
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textSecondary}
              />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={colors.textSecondary} style={{ margin: spacing.lg }} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>NO POSTS YET</Text>
                <Text style={styles.emptySubText}>
                  {territoryMode.type === 'territory'
                    ? `Nothing in ${territoryMode.territory.name} yet.`
                    : 'Be the first to post.'}
                </Text>
              </View>
            }
            contentContainerStyle={visiblePosts.length === 0 ? styles.emptyContainer : undefined}
            ItemSeparatorComponent={null}
          />
        )}

        {/* Territory selector modal */}
        <Modal
          visible={selectorOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectorOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectorOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SELECT FEED</Text>
                <TouchableOpacity onPress={() => setSelectorOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* NEAR ME option */}
                <TouchableOpacity
                  style={[
                    styles.territoryRow,
                    territoryMode.type === 'near_me' && styles.territoryRowActive,
                  ]}
                  onPress={handleSelectNearMe}
                  activeOpacity={0.7}
                >
                  <Text style={styles.territoryName}>NEAR ME</Text>
                  <Text style={styles.territoryMeta}>GPS</Text>
                </TouchableOpacity>

                {territoriesLoading ? (
                  <View style={styles.centeredSmall}>
                    <ActivityIndicator color={colors.textMuted} size="small" />
                  </View>
                ) : territories.length === 0 ? (
                  <View style={styles.centeredSmall}>
                    <Text style={styles.emptySubText}>NO TERRITORIES</Text>
                  </View>
                ) : (
                  territories.map(t => {
                    const isSelected =
                      territoryMode.type === 'territory' &&
                      territoryMode.territory.id === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.territoryRow, isSelected && styles.territoryRowActive]}
                        onPress={() => handleTerritorySelect(t)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.territoryName} numberOfLines={1}>
                          {t.name.toUpperCase()}
                        </Text>
                        <Text style={styles.territoryMeta}>{t.post_count} POSTS</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AgeGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
  },
  locationText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  chevron: {
    fontSize: 8,
    color: colors.border,
  },
  gpsLockBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 2,
    borderLeftColor: colors.textMuted,
    backgroundColor: '#0A0A0A',
  },
  gpsLockText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortTab: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sortTabActive: {
    borderBottomColor: colors.textPrimary,
  },
  sortLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.widest,
  },
  sortLabelActive: {
    color: colors.textPrimary,
  },
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  scopePill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 0,
  },
  scopePillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  scopeLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    fontWeight: '400',
  },
  scopeLabelActive: {
    color: colors.bg,
    fontWeight: '700',
  },
  expandedLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  centeredSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: tracking.wider,
  },
  emptySubText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    letterSpacing: tracking.wide,
  },
  // Territory selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  modalClose: {
    fontSize: typography.sm,
    color: colors.textMuted,
    padding: 4,
  },
  territoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  territoryRowActive: {
    backgroundColor: '#1F1F1F',
  },
  territoryName: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: tracking.wide,
  },
  territoryMeta: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginLeft: spacing.sm,
  },
});
