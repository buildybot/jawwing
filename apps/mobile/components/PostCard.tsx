import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, tracking, lineHeight } from '../lib/theme';
import { Post, vote } from '../lib/api';

interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
  onVoteChange?: (postId: string, newScore: number, newVote: 1 | -1 | null) => void;
  territoryName?: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}M`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H`;
  return `${Math.floor(hrs / 24)}D`;
}

function formatDistance(meters?: number): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)}M`;
  return `${(meters / 1000).toFixed(1)}KM`;
}

export function PostCard({ post, onPress, onVoteChange }: PostCardProps) {
  const [localScore, setLocalScore] = useState(post.score);
  const [localVote, setLocalVote] = useState<1 | -1 | null>(post.userVote ?? null);
  const [voting, setVoting] = useState(false);

  // Subtle scale pulse on vote (1.0 → 1.15 → 1.0, 150ms)
  const upScale = useRef(new Animated.Value(1)).current;
  const downScale = useRef(new Animated.Value(1)).current;

  const pulse = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.15, duration: 75, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1.0, duration: 75, useNativeDriver: true }),
    ]).start();
  };

  const handleVote = async (value: 1 | -1) => {
    if (voting) return;
    const newVote = localVote === value ? null : value;
    const delta = (newVote ?? 0) - (localVote ?? 0);
    const newScore = localScore + delta;

    // Optimistic + haptic + pulse
    setLocalVote(newVote);
    setLocalScore(newScore);
    pulse(value === 1 ? upScale : downScale);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setVoting(true);
    try {
      const res = await vote(post.id, newVote ?? 0);
      setLocalScore(res.score);
      onVoteChange?.(post.id, res.score, newVote);
    } catch {
      setLocalVote(localVote);
      setLocalScore(localScore);
    } finally {
      setVoting(false);
    }
  };

  const distance = formatDistance(post.distance);
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(post)}
    >
      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Metadata row */}
      <View style={styles.meta}>
        {/* Vote */}
        <View style={styles.voteRow}>
          <Animated.View style={{ transform: [{ scale: upScale }] }}>
            <TouchableOpacity onPress={() => handleVote(1)} activeOpacity={0.6} hitSlop={8}>
              <Text style={[styles.arrow, localVote === 1 && styles.arrowActive]}>▲</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={[styles.score, localVote !== null && styles.scoreActive]}>
            {localScore}
          </Text>
          <Animated.View style={{ transform: [{ scale: downScale }] }}>
            <TouchableOpacity onPress={() => handleVote(-1)} activeOpacity={0.6} hitSlop={8}>
              <Text style={[styles.arrow, styles.arrowDown, localVote === -1 && styles.arrowDownActive]}>▼</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.dot}>·</Text>

        {/* Reply count */}
        <Text style={styles.metaText}>↩ {post.replyCount}</Text>

        {distance ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.metaText}>{distance}</Text>
          </>
        ) : null}

        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>{timeAgo}</Text>

        {post.moderated ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.modTag}>REMOVED</Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.bgElevated,
  },
  content: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: lineHeight.body,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'nowrap',
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  arrow: {
    fontSize: 11,
    color: colors.textMuted,
  },
  arrowActive: {
    color: colors.upvote,
  },
  arrowDown: {
    color: colors.textMuted,
  },
  arrowDownActive: {
    color: colors.downvote,
  },
  score: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'center',
    letterSpacing: tracking.normal,
  },
  scoreActive: {
    color: colors.textPrimary,
  },
  dot: {
    fontSize: typography.xs,
    color: colors.border,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  modTag: {
    fontSize: typography.xs,
    color: colors.destructive,
    letterSpacing: tracking.wider,
    fontWeight: '600',
  },
});
