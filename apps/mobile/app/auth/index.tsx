import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, tracking, lineHeight } from '../../lib/theme';
import { sendCode, verifyCode } from '../../lib/api';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && step === 'code') {
      handleVerify();
    }
  }, [code]);

  const handleSendCode = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('ENTER A VALID EMAIL ADDRESS');
      return;
    }
    setLoading(true);
    try {
      await sendCode(trimmed);
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch {
      setError('FAILED TO SEND CODE. TRY AGAIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyCode(email.trim().toLowerCase(), code);
      router.replace('/(tabs)');
    } catch {
      setError('INVALID CODE. TRY AGAIN.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>JAWWING</Text>
          <Text style={styles.tagline}>Anonymous. Local. Honest.</Text>
        </View>

        <View style={styles.divider} />

        {/* Form */}
        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                autoFocus
                selectionColor={colors.textPrimary}
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
              />
              <View style={styles.divider} />
              <Text style={styles.hint}>
                We'll send a 6-digit code. No account. No profile. Just your location.
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color={colors.bg} />
                  : <Text style={styles.btnText}>SEND CODE</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <Text style={styles.subLabel}>
                Sent to {email}
              </Text>
              <TextInput
                ref={codeRef}
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                autoFocus
                selectionColor={colors.textPrimary}
                textAlign="center"
              />
              <View style={styles.divider} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading && (
                <View style={styles.verifying}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={styles.verifyingText}>VERIFYING…</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { setStep('email'); setCode(''); setError(null); }}
                activeOpacity={0.6}
              >
                <Text style={styles.backText}>← CHANGE EMAIL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  logoBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxl,
  },
  logo: {
    fontSize: typography.hero,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    letterSpacing: tracking.normal,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  form: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    flex: 1,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginBottom: spacing.sm,
  },
  subLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: tracking.wide,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    paddingVertical: spacing.lg,
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 12,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: lineHeight.tight + 4,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xl,
  },
  error: {
    fontSize: typography.xs,
    color: colors.destructive,
    letterSpacing: tracking.wide,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.bg,
    letterSpacing: tracking.wider,
  },
  verifying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  verifyingText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    letterSpacing: tracking.wider,
  },
  backBtn: {
    marginTop: spacing.lg,
  },
  backText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
});
