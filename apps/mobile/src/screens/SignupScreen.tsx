import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
import type { AuthSession, User } from '../types';

type SignupScreenProps = {
  onSignupSuccess: (session: AuthSession) => Promise<void>;
  onShowLogin: () => void;
};

export function SignupScreen({ onSignupSuccess, onShowLogin }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      setError('Complete all three fields.');
      return;
    }
    if (password.length < 6) {
      setError('Use at least 6 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const session = await apiRequest<{ token: string; user: User }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      await onSignupSuccess(session);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.mark} accessibilityElementsHidden>
              <Ionicons name="leaf" size={24} color={colors.surface} />
            </View>
            <Text style={styles.brand}>Chokro</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>START A BETTER NEXT LIFE</Text>
            <Text accessibilityRole="header" style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Public sign-up creates an individual account. Partner and admin access are verified separately.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              accessibilityLabel="Email address"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password, at least 6 characters"
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              accessibilityLabel="Confirm password"
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
              onSubmitEditing={() => void handleSignup()}
            />

            {error ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create individual account"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleSignup()}
            >
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Create account</Text>}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to sign in"
              style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
              onPress={onShowLogin}
              disabled={loading}
            >
              <Text style={styles.switchText}>Already have an account? <Text style={styles.switchStrong}>Sign in</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30 },
  mark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  intro: { marginBottom: 22 },
  eyebrow: { color: colors.leaf, fontSize: 12, lineHeight: 18, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1, marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 8, maxWidth: 430 },
  card: { backgroundColor: colors.surface, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadows.card },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.small, backgroundColor: colors.background, color: colors.ink, fontSize: 16, paddingHorizontal: 14, marginBottom: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: radii.small, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  primaryText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  switchButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginTop: 8 },
  switchText: { color: colors.muted, fontSize: 14 },
  switchStrong: { color: colors.leafDark, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
});
