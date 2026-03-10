import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, tracking } from '../../lib/theme';
import { clearDeviceId } from '../../lib/deviceId';

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

        {/* Identity */}
        <SectionHeader label="IDENTITY" />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MODE</Text>
          <Text style={styles.infoValue}>ANONYMOUS · NO ACCOUNT</Text>
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
});
