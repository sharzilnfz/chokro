// SignupScreen: public account-creation form — validates the three fields and
// password rules client-side, then calls signUp and links back to sign in.

// Imports: layout/keyboard primitives, icon + status bar, and shared auth UI.
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
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

// onShowLogin tells the shell to flip back to the sign-in screen.
type SignupScreenProps = {
  onShowLogin: () => void;
};

export function SignupScreen({ onShowLogin }: SignupScreenProps) {
  // signUp mutation plus the three form fields, visibility toggles, and local error/loading flags.
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validates completeness, email format, password length, and match before calling signUp.
  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      setError('Complete all three fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('Enter a valid email address.');
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
      await signUp({ email: normalizedEmail, password });
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    // Keyboard-aware and scrollable so inputs stay visible while typing.
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-[22px] py-[28px]" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-[10px] mb-[30px]">
            {/* Brand mark and app name. */}
            <View className="w-[44px] h-[44px] rounded-[15px] bg-leaf items-center justify-center" accessibilityElementsHidden>
              <Ionicons name="leaf" size={24} color={colors.surface} />
            </View>
            <Text className="text-ink text-[22px] font-extrabold tracking-tight">Chokro</Text>
          </View>

          {/* Welcome copy noting that partner/admin access is verified separately. */}
          <View className="mb-[22px]">
            <Text className="text-leaf text-[12px] leading-[18px] font-extrabold tracking-[1.3px]">START A BETTER NEXT LIFE</Text>
            <Text accessibilityRole="header" className="text-ink text-[34px] leading-[40px] font-extrabold tracking-tight mt-[5px]">Create your account</Text>
            <Text className="text-muted text-[15px] leading-[23px] mt-[8px] max-w-[430px]">Public sign-up creates an individual account. Partner and admin access are verified separately.</Text>
          </View>

          {/* The signup card: three inputs, inline error, submit, and login link. */}
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
              returnKeyType="next"
              editable={!loading}
            />

            <Input
              label="Password"
              accessibilityLabel="Password, at least 6 characters"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              returnKeyType="next"
              editable={!loading}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  className="p-[6px] -mr-[4px] justify-center items-center active:opacity-60"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.muted}
                  />
                </Pressable>
              }
            />

            <Input
              label="Confirm password"
              accessibilityLabel="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              textContentType="newPassword"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={() => void handleSignup()}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="p-[6px] -mr-[4px] justify-center items-center active:opacity-60"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.muted}
                  />
                </Pressable>
              }
            />

            {/* Surfaces a validation or sign-up failure message, if any. */}
            {error ? <ErrorBanner message={error} /> : null}

            <Button
              label="Create account"
              accessibilityLabel="Create individual account"
              loading={loading}
              onPress={() => void handleSignup()}
            />

            {/* Flipping back to sign-in — hidden while account creation is pending. */}
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
