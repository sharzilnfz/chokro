import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { apiRequest, getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import type { User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

type LoginScreenProps = {
  onShowSignup: () => void;
};

export function LoginScreen({ onShowSignup }: LoginScreenProps) {
  const { login } = useAuth();
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
      await login(session);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-[22px] py-[32px]"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center gap-[10px] mb-[44px]">
            <View className="w-[44px] h-[44px] rounded-[15px] bg-leaf items-center justify-center" accessibilityElementsHidden>
              <Ionicons name="leaf" size={24} color={colors.surface} />
            </View>
            <Text className="text-ink text-[22px] font-extrabold tracking-tight">Chokro</Text>
          </View>

          <View className="mb-[24px]">
            <Text className="text-leaf text-[12px] leading-[18px] font-extrabold tracking-[1.4px]">CIRCULAR, WITH PROOF</Text>
            <Text accessibilityRole="header" className="text-ink text-[36px] leading-[42px] font-extrabold tracking-tight mt-[5px]">Welcome back</Text>
            <Text className="text-muted text-[16px] leading-[24px] mt-[9px] max-w-[420px]">Sign in to list useful items, recognize drop zones, and see verified Green Credits.</Text>
          </View>

          <View className="bg-surface rounded-lg border border-border p-[20px] shadow-card" style={{ elevation: 2 }}>
            <Input
              label="Email address"
              accessibilityLabel="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Input
              label="Password"
              accessibilityLabel="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!loading}
              onSubmitEditing={() => void handleLogin()}
            />

            {error ? <ErrorBanner message={error} /> : null}

            <Button
              label="Sign in"
              loading={loading}
              onPress={() => void handleLogin()}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a new account"
              className="min-h-[48px] items-center justify-center px-[4px] mt-[8px] active:opacity-[0.75]"
              onPress={onShowSignup}
              disabled={loading}
            >
              <Text className="text-muted text-[14px]">New to Chokro? <Text className="text-leaf-dark font-extrabold">Create an account</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
