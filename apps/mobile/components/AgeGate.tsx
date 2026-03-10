import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, tracking } from '../lib/theme';

const AGE_KEY = 'jawwing_age_confirmed';

interface AgeGateProps {
  children: React.ReactNode;
}

type AgeState = 'unknown' | 'confirmed' | 'denied';

export function AgeGate({ children }: AgeGateProps) {
  const [ageState, setAgeState] = useState<AgeState>('unknown');

  useEffect(() => {
    AsyncStorage.getItem(AGE_KEY).then(val => {
      if (val === 'confirmed') setAgeState('confirmed');
      else if (val === 'denied') setAgeState('denied');
      else setAgeState('unknown');
    });
  }, []);

  const handleConfirm = async () => {
    await AsyncStorage.setItem(AGE_KEY, 'confirmed');
    setAgeState('confirmed');
  };

  const handleDeny = async () => {
    await AsyncStorage.setItem(AGE_KEY, 'denied');
    setAgeState('denied');
  };

  if (ageState === 'unknown') {
    // Don't flash content while loading
    return (
      <View style={styles.fullScreen}>
        <Modal visible transparent animationType="fade">
          <View style={styles.fullScreen}>
            <View style={styles.content}>
              <Text style={styles.eyebrow}>JAWWING</Text>
              <Text style={styles.title}>JAWWING IS FOR USERS 17 AND OLDER</Text>
              <Text style={styles.sub}>Anonymous, location-based public discourse. Adult content and strong language may appear.</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.btnPrimaryText}>I AM 17 OR OLDER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={handleDeny} activeOpacity={0.8}>
                <Text style={styles.btnSecondaryText}>I AM UNDER 17</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (ageState === 'denied') {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>JAWWING</Text>
          <Text style={styles.title}>SORRY</Text>
          <Text style={styles.sub}>Jawwing is only available to users 17 and older.</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 380,
  },
  eyebrow: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.widest,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.wide,
    lineHeight: 30,
    marginBottom: spacing.md,
  },
  sub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  btnPrimary: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnPrimaryText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: tracking.widest,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.widest,
  },
});
