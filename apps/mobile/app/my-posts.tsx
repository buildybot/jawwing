import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, typography, tracking, lineHeight } from '../lib/theme';
import { getMyPosts, Post, MyPostsResponse } from '../lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function PostCard({ post, isBest }: { post: Post; isBest: boolean }) {
  return (
    <View style={[styles.card, isBest && styles.cardBest]}>
      {isBest && <Text style={styles.bestBadge}>BEST PERFORMER</Text>}
      <Text style={styles.cardContent} numberOfLines={4}>{post.content}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.metaItem}>▲ {post.score}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaItem}>{post.replyCount ?? 0} replies</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaItem}>{timeAgo(post.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function MyPostsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MyPostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await getMyPosts();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bestPost = data && data.posts.length > 0
    ? data.posts.reduce((a, b) => (a.score > b.score ? a : b))
    : null;

  const renderItem = ({ item }: { item: Post }) => (
    <PostCard post={item} isBest={bestPost?.id === item.id} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>MY POSTS</Text>
        <View style={{ width: 48 }} />
      </View>
      <View style={styles.divider} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.posts ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.textMuted}
            />
          }
          ListHeaderComponent={data && data.posts.length > 0 ? (
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data.meta.count}</Text>
                <Text style={styles.statLabel}>POSTS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data.meta.totalScore}</Text>
                <Text style={styles.statLabel}>TOTAL UPVOTES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data.meta.avgScore.toFixed(1)}</Text>
                <Text style={styles.statLabel}>AVG SCORE</Text>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No posts yet.</Text>
              <Text style={styles.emptySubText}>Start posting!</Text>
            </View>
          }
          contentContainerStyle={data?.posts.length === 0 ? { flex: 1 } : undefined}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
    width: 48,
  },
  headerLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.destructive,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    letterSpacing: tracking.wider,
  },
  emptyText: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
  },
  emptySubText: {
    fontSize: typography.sm,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  stats: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  card: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardBest: {
    borderLeftWidth: 2,
    borderLeftColor: colors.textPrimary,
  },
  bestBadge: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.wider,
    marginBottom: spacing.xs,
  },
  cardContent: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: lineHeight.body,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaItem: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  metaDot: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
});
