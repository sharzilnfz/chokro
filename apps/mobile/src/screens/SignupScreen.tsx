import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { apiRequest, getErrorMessage } from '../api';
import { colors } from '../theme';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';

type SignupScreenProps = {
  onShowLogin: () => void;
};

export function SignupScreen({ onShowLogin }: SignupScreenProps) {
  const { login } = useAuth();
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
      await login(session);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-[22px] py-[28px]" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-[10px] mb-[30px]">
            <View className="w-[44px] h-[44px] rounded-[15px] bg-leaf items-center justify-center" accessibilityElementsHidden>
              <Ionicons name="leaf" size={24} color={colors.surface} />
            </View>
            <Text className="text-ink text-[22px] font-extrabold tracking-tight">Chokro</Text>
          </View>

          <View className="mb-[22px]">
            <Text className="text-leaf text-[12px] leading-[18px] font-extrabold tracking-[1.3px]">START A BETTER NEXT LIFE</Text>
            <Text accessibilityRole="header" className="text-ink text-[34px] leading-[40px] font-extrabold tracking-tight mt-[5px]">Create your account</Text>
            <Text className="text-muted text-[15px] leading-[23px] mt-[8px] max-w-[430px]">Public sign-up creates an individual account. Partner and admin access are verified separately.</Text>
          </View>

          <View className="bg-surface rounded-lg border border-border p-[20px] shadow-card" style={{ elevation: 2 }}>
            <Text className="text-ink text-[14px] font-bold mb-[7px]">Email address</Text>
            <TextInput
              accessibilityLabel="Email address"
              className="min-h-[52px] border border-border rounded-sm bg-background text-ink text-[16px] px-[14px] mb-[14px]"
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

            <Text className="text-ink text-[14px] font-bold mb-[7px]">Password</Text>
            <TextInput
              accessibilityLabel="Password, at least 6 characters"
              className="min-h-[52px] border border-border rounded-sm bg-background text-ink text-[16px] px-[14px] mb-[14px]"
              placeholder="At least 6 characters"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
            />

            <Text className="text-ink text-[14px] font-bold mb-[7px]">Confirm password</Text>
            <TextInput
              accessibilityLabel="Confirm password"
              className="min-h-[52px] border border-border rounded-sm bg-background text-ink text-[16px] px-[14px] mb-[14px]"
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
              <View accessibilityRole="alert" className="flex-row items-center gap-[8px] bg-danger-soft rounded-sm p-[12px] mb-[14px]">
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text className="flex-1 text-danger text-[14px] leading-[20px] font-semibold">{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create individual account"
              accessibilityState={{ disabled: loading, busy: loading }}
              className={`min-h-[52px] rounded-[14px] bg-leaf items-center justify-center mt-[2px] active:opacity-[0.75] ${loading ? 'opacity-[0.55]' : ''}`}
              disabled={loading}
              onPress={() => void handleSignup()}
            >
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text className="text-surface text-[16px] font-extrabold">Create account</Text>}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to sign in"
              className="min-h-[48px] items-center justify-center px-[4px] mt-[8px] active:opacity-[0.75]"
              onPress={onShowLogin}
              disabled={loading}
            >
              <Text className="text-muted text-[14px]">Already have an account? <Text className="text-leaf-dark font-extrabold">Sign in</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
