import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, tracking } from '../lib/theme';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.dividerV} />
        <Text style={styles.title}>ABOUT JAWWING</Text>
      </View>
      <View style={styles.divider} />
      <WebView
        source={{ uri: 'https://jawwing.com/about' }}
        style={styles.webview}
        contentInsetAdjustmentBehavior="never"
        backgroundColor="#000000"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: typography.xs,
    color: colors.textPrimary,
    letterSpacing: tracking.wider,
    fontWeight: '600',
  },
  dividerV: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
