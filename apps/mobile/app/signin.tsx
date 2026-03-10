import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, typography, tracking } from '../lib/theme';
import { sendCode, verifyCode } from '../lib/api';
import { setAccountToken } from '../lib/auth';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendCode(trimmed);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyCode(email.trim().toLowerCase(), trimmedCode);
      await setAccountToken(res.token);
      router.replace('/my-posts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.heading}>OPTIONAL SIGN IN</Text>
          <Text style={styles.sub}>
            Get notifications when someone replies. See your post history.
          </Text>
          <Text style={styles.anon}>Completely anonymous. Your email is encrypted.</Text>

          <View style={styles.divider} />

          {step === 'email' ? (
            <>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={styles.btnText}>SEND CODE</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>CODE SENT TO {email.toUpperCase()}</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={styles.btnText}>VERIFY</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setError(null); }}>
                <Text style={styles.resend}>RESEND CODE</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  back: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  anon: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  codeInput: {
    fontSize: typography.xl,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: {
    fontSize: typography.xs,
    color: colors.destructive,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: tracking.wider,
  },
  resend: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
