import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, tracking, lineHeight } from '../../lib/theme';
import { Post, Reply, getReplies, createReply, reportPost, vote } from '../../lib/api';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}M`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H`;
  return `${Math.floor(hrs / 24)}D`;
}

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localScore, setLocalScore] = useState(0);
  const [localVote, setLocalVote] = useState<1 | -1 | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getReplies(id);
      setReplies(data);
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  useEffect(() => {
    if (post) {
      setLocalScore(post.score);
      setLocalVote(post.userVote ?? null);
    }
  }, [post]);

  const handleVote = async (value: 1 | -1) => {
    if (!id) return;
    const newVote = localVote === value ? null : value;
    const delta = (newVote ?? 0) - (localVote ?? 0);
    setLocalVote(newVote);
    setLocalScore(s => s + delta);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await vote(id, newVote ?? 0);
      setLocalScore(res.score);
    } catch {
      setLocalVote(localVote);
      setLocalScore(post?.score ?? 0);
    }
  };

  const handleReply = async () => {
    if (!id || !replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const reply = await createReply(id, replyText.trim());
      setReplies(prev => [reply, ...prev]);
      setReplyText('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = () => {
    if (!id) return;
    Alert.alert(
      'REPORT POST',
      'Why are you reporting this post?',
      [
        { text: 'SPAM', onPress: () => sendReport('spam') },
        { text: 'HARASSMENT', onPress: () => sendReport('harassment') },
        { text: 'MISINFORMATION', onPress: () => sendReport('misinformation') },
        { text: 'CANCEL', style: 'cancel' },
      ]
    );
  };

  const sendReport = async (reason: string) => {
    if (!id) return;
    try {
      await reportPost(id, reason);
      Alert.alert('REPORTED', 'Thank you. Moderators will review this post.');
    } catch {
      // silent
    }
  };

  const ListHeader = () => (
    <View>
      {/* Post content */}
      <View style={styles.postBlock}>
        <Text style={styles.postContent}>{post?.content ?? ''}</Text>
        {/* Vote row */}
        <View style={styles.voteRow}>
          <TouchableOpacity onPress={() => handleVote(1)} hitSlop={8} activeOpacity={0.6}>
            <Text style={[styles.arrow, localVote === 1 && styles.arrowUp]}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.score}>{localScore}</Text>
          <TouchableOpacity onPress={() => handleVote(-1)} hitSlop={8} activeOpacity={0.6}>
            <Text style={[styles.arrow, localVote === -1 && styles.arrowDown]}>▼</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{replies.length} REPLIES</Text>
          {post && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{formatTimeAgo(post.createdAt)}</Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleReport} hitSlop={8} activeOpacity={0.6}>
            <Text style={styles.reportText}>REPORT</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />
      {/* Replies label */}
      <View style={styles.repliesLabel}>
        <Text style={styles.repliesLabelText}>COMMENTS</Text>
        <View style={styles.sectionLine} />
      </View>
    </View>
  );

  const renderReply = ({ item }: { item: Reply }) => (
    <View style={styles.replyRow}>
      <View style={styles.replyThread} />
      <View style={styles.replyContent}>
        <Text style={styles.replyText}>{item.content}</Text>
        <Text style={styles.replyMeta}>
          ▲ {item.score} · {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>POST</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.divider} />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : (
          <FlatList
            data={replies}
            keyExtractor={item => item.id}
            renderItem={renderReply}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>NO COMMENTS YET</Text>
                <Text style={styles.emptySubText}>Be the first to reply.</Text>
              </View>
            }
            contentContainerStyle={replies.length === 0 ? styles.emptyContainer : undefined}
          />
        )}

        {/* Reply input */}
        <View style={[styles.replyBar, { paddingBottom: insets.bottom || spacing.sm }]}>
          <View style={styles.divider} />
          <View style={styles.replyInputRow}>
            <TextInput
              style={styles.replyInput}
              placeholder="ADD A COMMENT..."
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              maxLength={300}
              selectionColor={colors.textPrimary}
            />
            <TouchableOpacity
              onPress={handleReply}
              disabled={!replyText.trim() || submitting}
              style={[styles.sendBtn, (!replyText.trim() || submitting) && styles.sendBtnDisabled]}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <Text style={styles.sendBtnText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyContainer: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  navTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },

  postBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  postContent: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  arrowUp: { color: colors.upvote },
  arrowDown: { color: colors.downvote },
  score: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'center',
  },
  dot: { fontSize: typography.xs, color: colors.border },
  metaText: { fontSize: typography.xs, color: colors.textMuted, letterSpacing: tracking.wide },
  reportText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  repliesLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  repliesLabelText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },

  replyRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  replyThread: {
    width: 1,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
  },
  replyContent: { flex: 1 },
  replyText: {
    fontSize: typography.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  replyMeta: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },

  emptyText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '600', letterSpacing: tracking.wider },
  emptySubText: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.xs, letterSpacing: tracking.wide },

  replyBar: {
    backgroundColor: colors.bg,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.textPrimary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: tracking.wide,
  },
  sendBtn: {
    backgroundColor: colors.textPrimary,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.bg,
  },
});
