import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { clearDeviceId } from '../../lib/deviceId';

const BLOCKED_USERS_KEY = 'jw_blocked_users';

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    loadBlockedCount();
  }, []);

  const loadBlockedCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      setBlockedCount(list.length);
    } catch {
      setBlockedCount(0);
    }
  };

  const handleUnblockAll = () => {
    Alert.alert(
      'UNBLOCK ALL',
      `Unblock all ${blockedCount} blocked user(s)?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'UNBLOCK ALL',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(BLOCKED_USERS_KEY);
            setBlockedCount(0);
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'CLEAR DATA',
      'This will reset your anonymous device identity, blocked users, and all preferences. Your posts will remain but you will no longer be associated with them.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CLEAR',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearDeviceId();
              await AsyncStorage.removeItem(BLOCKED_USERS_KEY);
              await AsyncStorage.clear();
              setBlockedCount(0);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const openWebView = (url: string, title: string) => {
    router.push(`/webview?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.logo}>JAWWING</Text>
        <Text style={styles.headerLabel}>SETTINGS</Text>
      </View>
      <View style={styles.divider} />

      <ScrollView>
        {/* About section */}
        <SectionHeader label="APP" />
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/about')}
          activeOpacity={0.6}
        >
          <Text style={styles.rowLabel}>ABOUT JAWWING</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/constitution')}
          activeOpacity={0.6}
        >
          <Text style={styles.rowLabel}>CONSTITUTION</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => openWebView('https://jawwing.com/terms', 'TERMS')}
          activeOpacity={0.6}
        >
          <Text style={styles.rowLabel}>TERMS</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => openWebView('https://jawwing.com/privacy', 'PRIVACY')}
          activeOpacity={0.6}
        >
          <Text style={styles.rowLabel}>PRIVACY</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.divider} />

        {/* Identity */}
        <SectionHeader label="IDENTITY" />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MODE</Text>
          <Text style={styles.infoValue}>ANONYMOUS · NO ACCOUNT</Text>
        </View>
        <View style={styles.divider} />

        {/* Blocked users */}
        <SectionHeader label="MODERATION" />
        <View style={styles.blockedRow}>
          <View>
            <Text style={styles.rowLabel}>BLOCKED USERS</Text>
            <Text style={styles.blockedCount}>{blockedCount} BLOCKED</Text>
          </View>
          {blockedCount > 0 && (
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={handleUnblockAll}
              activeOpacity={0.7}
            >
              <Text style={styles.unblockBtnText}>UNBLOCK ALL</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />

        {/* Danger zone */}
        <SectionHeader label="DATA" />
        <TouchableOpacity
          style={styles.row}
          onPress={handleClearData}
          activeOpacity={0.7}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Text style={styles.clearLabel}>CLEAR DATA</Text>
          )}
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
  logo: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  headerLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    letterSpacing: tracking.wide,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
  },
  infoValue: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    letterSpacing: tracking.wide,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blockedCount: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  unblockBtnText: {
    fontSize: typography.xs,
    color: colors.destructive,
    letterSpacing: tracking.wider,
    fontWeight: '600',
  },
  clearLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.destructive,
    letterSpacing: tracking.wider,
  },
});
