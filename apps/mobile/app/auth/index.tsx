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

type Step = 'phone' | 'code';

const COUNTRY_CODE = '+1'; // MVP: US only

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
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
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('ENTER A VALID PHONE NUMBER');
      return;
    }
    setLoading(true);
    try {
      await sendCode(`${COUNTRY_CODE}${cleaned}`);
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
    const cleaned = phone.replace(/\D/g, '');
    setLoading(true);
    try {
      await verifyCode(`${COUNTRY_CODE}${cleaned}`, code);
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
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={14}
                  autoFocus
                  selectionColor={colors.textPrimary}
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                />
              </View>
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
                Sent to {COUNTRY_CODE} {phone}
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
                onPress={() => { setStep('phone'); setCode(''); setError(null); }}
                activeOpacity={0.6}
              >
                <Text style={styles.backText}>← CHANGE NUMBER</Text>
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderBright,
    marginBottom: spacing.md,
  },
  countryCode: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  countryCodeText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    letterSpacing: tracking.wide,
  },
  inputDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
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
