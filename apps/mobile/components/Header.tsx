import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, tracking } from '../lib/theme';

interface HeaderProps {
  locationName?: string;
}

export function Header({ locationName }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>JAWWING</Text>
      {locationName ? (
        <View style={styles.location}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
    fontVariant: ['tabular-nums'],
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
  },
  locationText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
});
