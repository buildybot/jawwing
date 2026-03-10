import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { PostCard } from '../../components/PostCard';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { getProfile, getMyPosts, clearToken, Post } from '../../lib/api';
import { useRouter } from 'expo-router';

interface Profile {
  displayName: string;
  userId: string;
}

const LINKS = [
  { label: 'COMMUNITY CONSTITUTION', url: 'https://jawwing.com/constitution' },
  { label: 'TERMS OF SERVICE', url: 'https://jawwing.com/terms' },
  { label: 'PRIVACY POLICY', url: 'https://jawwing.com/privacy' },
];

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, myPosts] = await Promise.all([getProfile(), getMyPosts()]);
        setProfile(p);
        setPosts(myPosts);
      } catch {
        // Not authed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignOut = async () => {
    await clearToken();
    router.replace('/auth');
  };

  const activePosts = posts.filter(p => !p.moderated);
  const moderatedPosts = posts.filter(p => p.moderated);

  const ListHeader = () => (
    <View>
      {/* Identity block */}
      <View style={styles.identityBlock}>
        <Text style={styles.displayName}>{profile?.displayName ?? '—'}</Text>
        <Text style={styles.identityMeta}>ANONYMOUS · JAWWING</Text>
      </View>
      <View style={styles.divider} />

      {/* Mod transparency */}
      {moderatedPosts.length > 0 && (
        <View>
          <SectionHeader label="MODERATION ACTIONS" />
          {moderatedPosts.map(p => (
            <View key={p.id} style={styles.modRow}>
              <View style={styles.modIndicator} />
              <View style={styles.modContent}>
                <Text style={styles.modText} numberOfLines={2}>{p.content}</Text>
                <Text style={styles.modReason}>{p.moderationReason ?? 'REMOVED BY MODERATOR'}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
        </View>
      )}

      <SectionHeader label="YOUR POSTS" />
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerBlock}>
      <View style={styles.divider} />
      <SectionHeader label="LINKS" />
      {LINKS.map(link => (
        <TouchableOpacity
          key={link.url}
          style={styles.linkRow}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.6}
        >
          <Text style={styles.linkText}>{link.label}</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={activePosts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={<ListFooter />}
          ListEmptyComponent={
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyText}>NO POSTS YET</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  identityBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  displayName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.tight,
    marginBottom: 4,
  },
  identityMeta: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  modRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modIndicator: {
    width: 2,
    backgroundColor: colors.destructive,
    marginRight: spacing.sm,
  },
  modContent: { flex: 1 },
  modText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modReason: {
    fontSize: typography.xs,
    color: colors.destructive,
    marginTop: 4,
    letterSpacing: tracking.wide,
  },
  emptyPosts: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  footerBlock: {
    marginTop: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    letterSpacing: tracking.wide,
  },
  signOutRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.destructive,
    letterSpacing: tracking.wider,
  },
});
