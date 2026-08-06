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

type LoginScreenProps = {
  onLoginSuccess: (session: AuthSession) => Promise<void>;
  onShowSignup: () => void;
};

export function LoginScreen({ onLoginSuccess, onShowSignup }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const session = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      await onLoginSuccess(session);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <View style={styles.mark} accessibilityElementsHidden>
              <Ionicons name="leaf" size={24} color={colors.surface} />
            </View>
            <Text style={styles.brand}>Chokro</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>CIRCULAR, WITH PROOF</Text>
            <Text accessibilityRole="header" style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to list useful items, recognize drop zones, and see verified Green Credits.</Text>
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
              accessibilityLabel="Password"
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!loading}
              onSubmitEditing={() => void handleLogin()}
            />

            {error ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleLogin()}
            >
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Sign in</Text>}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a new account"
              style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
              onPress={onShowSignup}
              disabled={loading}
            >
              <Text style={styles.switchText}>New to Chokro? <Text style={styles.switchStrong}>Create an account</Text></Text>
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
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 32 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 44 },
  mark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  intro: { marginBottom: 24 },
  eyebrow: { color: colors.leaf, fontSize: 12, lineHeight: 18, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1.1, marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 9, maxWidth: 420 },
  card: { backgroundColor: colors.surface, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadows.card },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.small, backgroundColor: colors.background, color: colors.ink, fontSize: 16, paddingHorizontal: 14, marginBottom: 16 },
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
