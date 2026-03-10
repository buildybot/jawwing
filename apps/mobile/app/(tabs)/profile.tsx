import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { clearDeviceId } from '../../lib/deviceId';
import { unblockAll, invalidateBlockedCache } from '../../lib/blocked';
import { isSignedIn, clearAccountToken, getAccountToken } from '../../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PREF_KEY = 'jw_notif_replies';

const LINKS = [
  { label: 'COMMUNITY CONSTITUTION', url: 'https://www.jawwing.com/constitution' },
  { label: 'TERMS OF SERVICE', url: 'https://www.jawwing.com/terms' },
  { label: 'PRIVACY POLICY', url: 'https://www.jawwing.com/privacy' },
];

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
  const [clearing, setClearing] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const checkAuth = useCallback(async () => {
    const [signed, notifPref] = await Promise.all([
      isSignedIn(),
      AsyncStorage.getItem(NOTIF_PREF_KEY),
    ]);
    setSignedIn(signed);
    setNotifEnabled(notifPref !== 'false');
  }, []);

  // Refresh when screen comes into focus (e.g. after signing in)
  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  const handleNotifToggle = async (value: boolean) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem(NOTIF_PREF_KEY, value ? 'true' : 'false');
  };

  const handleSignOut = () => {
    Alert.alert(
      'SIGN OUT',
      'You will no longer receive reply notifications.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'SIGN OUT',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await clearAccountToken();
              setSignedIn(false);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'CLEAR DATA',
      'This will reset your anonymous device identity. Your posts will remain but you will no longer be associated with them.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CLEAR',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearDeviceId();
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
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
        {/* About */}
        <View style={styles.aboutBlock}>
          <Text style={styles.aboutTitle}>ABOUT JAWWING</Text>
          <Text style={styles.aboutBody}>
            Anonymous, location-based public discourse. Post what you see, vote on what matters, keep it local.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* Account */}
        <SectionHeader label="ACCOUNT" />
        {signedIn ? (
          <>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/my-posts')}
              activeOpacity={0.6}
            >
              <Text style={styles.rowLabel}>MY POSTS</Text>
              <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>REPLY NOTIFICATIONS</Text>
              <Switch
                value={notifEnabled}
                onValueChange={handleNotifToggle}
                trackColor={{ false: colors.bgElevated, true: colors.textPrimary }}
                thumbColor={colors.bg}
                ios_backgroundColor={colors.bgElevated}
              />
            </View>
            <TouchableOpacity
              style={styles.row}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <Text style={styles.signOutLabel}>SIGN OUT</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MODE</Text>
              <Text style={styles.infoValue}>ANONYMOUS · NO ACCOUNT</Text>
            </View>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/signin')}
              activeOpacity={0.6}
            >
              <View>
                <Text style={styles.rowLabel}>SIGN IN</Text>
                <Text style={styles.rowSub}>Get reply notifications · optional</Text>
              </View>
              <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
        <View style={styles.divider} />

        {/* Links */}
        <SectionHeader label="LINKS" />
        {LINKS.map(link => (
          <TouchableOpacity
            key={link.url}
            style={styles.row}
            onPress={() => Linking.openURL(link.url)}
            activeOpacity={0.6}
          >
            <Text style={styles.rowLabel}>{link.label}</Text>
            <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        <View style={styles.divider} />

        {/* Danger zone */}
        <SectionHeader label="DATA" />
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            Alert.alert(
              'UNBLOCK ALL',
              'All blocked users will be visible in your feed again.',
              [
                { text: 'CANCEL', style: 'cancel' },
                {
                  text: 'UNBLOCK ALL',
                  style: 'destructive',
                  onPress: async () => {
                    setUnblocking(true);
                    try {
                      await unblockAll();
                      invalidateBlockedCache();
                    } finally {
                      setUnblocking(false);
                    }
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
          disabled={unblocking}
        >
          {unblocking ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={styles.rowLabel}>UNBLOCK ALL USERS</Text>
          )}
        </TouchableOpacity>
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
  aboutBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  aboutTitle: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  aboutBody: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
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
  rowSub: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
    marginTop: 2,
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
  clearLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.destructive,
    letterSpacing: tracking.wider,
  },
  signOutLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.destructive,
    letterSpacing: tracking.wider,
  },
});
