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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { PostCard } from '../../components/PostCard';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { getPosts, getTerritories, getTerritoryFeed, Post, Territory } from '../../lib/api';
import { getLocationInfo, requestLocationPermission, LocationInfo } from '../../lib/location';

type SortMode = 'hot' | 'new' | 'top';
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'hot', label: 'HOT' },
  { key: 'new', label: 'NEW' },
  { key: 'top', label: 'TOP' },
];
const PAGE_SIZE = 20;

type TerritoryMode =
  | { type: 'near_me' }
  | { type: 'territory'; territory: Territory };

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortMode>('hot');
  const [posts, setPosts] = useState<Post[]>([]);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  // Territory state
  const [territoryMode, setTerritoryMode] = useState<TerritoryMode>({ type: 'near_me' });
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // GPS-lock: can only post when in "near me" mode
  const isRemoteTerritory = territoryMode.type === 'territory';

  useEffect(() => {
    (async () => {
      await requestLocationPermission();
      const info = await getLocationInfo();
      setLocation(info);
    })();
  }, []);

  // Fetch territories for selector
  useEffect(() => {
    setTerritoriesLoading(true);
    getTerritories()
      .then(setTerritories)
      .catch(() => {})
      .finally(() => setTerritoriesLoading(false));
  }, []);

  const loadPosts = useCallback(
    async (pageNum: number, currentSort: SortMode, refresh = false) => {
      try {
        let data: Post[];

        if (territoryMode.type === 'territory') {
          const offset = (pageNum - 1) * PAGE_SIZE;
          const result = await getTerritoryFeed(territoryMode.territory.id, {
            sort: currentSort,
            limit: PAGE_SIZE,
            offset,
          });
          data = result.posts;
        } else {
          data = await getPosts({
            sort: currentSort,
            lat: location?.lat,
            lng: location?.lng,
            page: pageNum,
            limit: PAGE_SIZE,
          });
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
    [location, territoryMode]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    loadPosts(1, sort).finally(() => setLoading(false));
  }, [sort, location, territoryMode]);

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
      prev.map(p => p.id === postId ? { ...p, score: newScore, userVote: newVote } : p)
    );
  };

  const currentLocationLabel =
    territoryMode.type === 'territory'
      ? territoryMode.territory.name.toUpperCase()
      : location?.displayName ?? undefined;

  const handleTerritorySelect = (t: Territory) => {
    setTerritoryMode({ type: 'territory', territory: t });
    setSelectorOpen(false);
  };

  const handleSelectNearMe = () => {
    setTerritoryMode({ type: 'near_me' });
    setSelectorOpen(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — tapping location area opens selector */}
      <View style={styles.headerWrapper}>
        <Text style={styles.logo}>JAWWING</Text>
        <TouchableOpacity
          onPress={() => setSelectorOpen(true)}
          style={styles.locationButton}
          activeOpacity={0.7}
        >
          <Text style={styles.locationText} numberOfLines={1}>
            {currentLocationLabel ?? 'LOCATING...'}
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onVoteChange={handleVoteChange}
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
          contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
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
                    territoryMode.type === 'territory' && territoryMode.territory.id === t.id;
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
