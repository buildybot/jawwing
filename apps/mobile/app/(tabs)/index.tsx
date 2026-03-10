import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { PostCard } from '../../components/PostCard';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { getPosts, Post } from '../../lib/api';
import { getLocationInfo, requestLocationPermission, LocationInfo } from '../../lib/location';

type SortMode = 'hot' | 'new' | 'top';
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'hot', label: 'HOT' },
  { key: 'new', label: 'NEW' },
  { key: 'top', label: 'TOP' },
];
const PAGE_SIZE = 20;

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

  useEffect(() => {
    (async () => {
      await requestLocationPermission();
      const info = await getLocationInfo();
      setLocation(info);
    })();
  }, []);

  const loadPosts = useCallback(async (pageNum: number, currentSort: SortMode, refresh = false) => {
    try {
      const data = await getPosts({
        sort: currentSort,
        lat: location?.lat,
        lng: location?.lng,
        page: pageNum,
        limit: PAGE_SIZE,
      });
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
  }, [location]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    loadPosts(1, sort).finally(() => setLoading(false));
  }, [sort, location]);

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
      prev.map(p => p.id === postId ? { ...p, score: newScore, userVote: newVote } : p),
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header locationName={location?.displayName} />

      {/* Sort tabs — uppercase, active = white text + bottom border */}
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
            <PostCard post={item} onVoteChange={handleVoteChange} />
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
              <Text style={styles.emptyText}>NO POSTS NEARBY</Text>
              <Text style={styles.emptySubText}>Be the first to post.</Text>
            </View>
          }
          contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
          // Tight stacking — 2px gap equivalent via border-bottom on cards
          ItemSeparatorComponent={null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
});
