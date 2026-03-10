import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '../../components/Header';
import { colors, spacing, typography, tracking, lineHeight } from '../../lib/theme';
import { createPost } from '../../lib/api';
import { getLocationInfo, LocationInfo } from '../../lib/location';

const MAX_CHARS = 300;

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLocationInfo().then(setLocation);
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() || !location || submitting) return;
    setSubmitting(true);
    try {
      await createPost({ content: content.trim(), lat: location.lat, lng: location.lng });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setContent('');
      showSuccess();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const showSuccess = () => {
    setSuccess(true);
    // Fade in, hold, fade out — no springs, no bounces
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setSuccess(false));
  };

  const remaining = MAX_CHARS - content.length;
  const canSubmit = content.trim().length > 0 && !!location && !submitting;
  const counterColor =
    remaining < 10 ? colors.destructive :
    remaining < 30 ? colors.textSecondary :
    colors.textMuted;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header row with POST button on the right */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>JAWWING</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Text style={styles.postBtnText}>POST</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {/* Location bar */}
        <View style={styles.locationBar}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          {location ? (
            <Text style={styles.locationText}>{location.displayName.toUpperCase()}</Text>
          ) : (
            <Text style={styles.locationText}>LOCATING…</Text>
          )}
        </View>
        <View style={styles.divider} />

        {/* Input — full bleed, no borders, just cursor */}
        <TextInput
          style={styles.input}
          placeholder="What's happening nearby?"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_CHARS}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
          autoFocus
          selectionColor={colors.textPrimary}
        />

        {/* Character counter — bottom right, mono */}
        <View style={styles.counterRow}>
          <Text style={[styles.counter, { color: counterColor }]}>{remaining}</Text>
        </View>

        {/* Success overlay — fade only, no animation gimmicks */}
        {success && (
          <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]} pointerEvents="none">
            <Text style={styles.successText}>POSTED</Text>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  topTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: lineHeight.body,
  },
  counterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'flex-end',
  },
  counter: {
    fontSize: typography.xs,
    fontWeight: '600',
    letterSpacing: tracking.wide,
  },
  postBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    // NO border radius
  },
  postBtnDisabled: {
    opacity: 0.3,
  },
  postBtnText: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.bg,
    letterSpacing: tracking.wider,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  successText: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
});
