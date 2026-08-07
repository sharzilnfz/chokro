import "./global.css";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, ApiError, getErrorMessage } from './src/api';
import { colors } from './src/theme';
import type { AuthSession, User } from './src/types';
import { FeedScreen } from './src/screens/FeedScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { RateCardScreen } from './src/screens/RateCardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';

const TOKEN_KEY = 'chokro.authToken';

type Tab = 'browse' | 'list' | 'rates' | 'wallet' | 'scan';
type AuthMode = 'login' | 'signup';
type RestoreState = 'loading' | 'ready' | 'error';

const TABS: Array<{
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'browse', label: 'Browse', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'list', label: 'List', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { key: 'rates', label: 'Rates', icon: 'pricetag-outline', activeIcon: 'pricetag' },
  { key: 'wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
  { key: 'scan', label: 'Scan', icon: 'scan-outline', activeIcon: 'scan' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoreState, setRestoreState] = useState<RestoreState>('loading');
  const [restoreError, setRestoreError] = useState('');

  const restoreSession = async () => {
    setRestoreState('loading');
    setRestoreError('');

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setSession(null);
        setRestoreState('ready');
        return;
      }

      const data = await apiRequest<{ user: User }>('/api/auth/me', { token });
      setSession({ token, user: data.user });
      setRestoreState('ready');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch {
          // The rejected token remains unusable even if the device keychain cannot be updated.
        }
        setSession(null);
        setRestoreState('ready');
        return;
      }
      setRestoreError(getErrorMessage(error, 'Could not restore your session.'));
      setRestoreState('error');
    }
  };

  useEffect(() => {
    void restoreSession();
  }, []);

  const handleAuthenticated = async (nextSession: AuthSession) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextSession.token);
    setSession(nextSession);
    setActiveTab('browse');
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setSession(null);
      setAuthMode('login');
    }
  };

  if (restoreState === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <View className="w-14 h-14 rounded-[18px] bg-leaf items-center justify-center mb-2.5" accessibilityElementsHidden>
          <Ionicons name="leaf" size={25} color={colors.surface} />
        </View>
        <Text className="text-ink text-[28px] font-extrabold tracking-tight mb-7">Chokro</Text>
        <ActivityIndicator color={colors.leaf} size="large" accessibilityLabel="Restoring session" />
        <Text className="text-muted mt-3 text-sm">Restoring your secure session</Text>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (restoreState === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <View className="w-full max-w-[430px] p-6 rounded-3xl bg-surface border border-border items-center" accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
          <Text className="text-ink text-[21px] font-extrabold mt-3">Session check unavailable</Text>
          <Text className="text-muted text-[15px] leading-[22px] text-center mt-2 mb-[18px]">{restoreError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry session restoration"
            className="min-h-[50px] w-full rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"
            onPress={() => void restoreSession()}
          >
            <Text className="text-surface text-base font-extrabold">Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear saved session and sign in"
            className="min-h-[48px] items-center justify-center mt-1.5 active:opacity-[0.72]"
            onPress={async () => {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              setSession(null);
              setRestoreState('ready');
            }}
          >
            <Text className="text-leaf-dark text-[15px] font-bold">Use another account</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return authMode === 'login' ? (
      <LoginScreen onLoginSuccess={handleAuthenticated} onShowSignup={() => setAuthMode('signup')} />
    ) : (
      <SignupScreen onSignupSuccess={handleAuthenticated} onShowLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="min-h-[66px] flex-row items-center justify-between px-[18px] border-b border-border bg-background">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-leaf items-center justify-center" accessibilityElementsHidden>
            <Ionicons name="leaf" size={18} color={colors.surface} />
          </View>
          <View>
            <Text className="text-ink text-lg font-extrabold tracking-tight">Chokro</Text>
            <Text className="text-muted text-[11px] mt-[1px] max-w-[220px]" numberOfLines={1}>{session.user.email}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
          className="w-12 h-12 items-center justify-center rounded-[14px] active:opacity-[0.72]"
          onPress={() => void handleLogout()}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.leafDark} />
        </Pressable>
      </View>

      <View className="flex-1">
        {activeTab === 'browse' && <FeedScreen token={session.token} />}
        {activeTab === 'list' && (
          <CreateListingScreen token={session.token} onCreated={() => setActiveTab('browse')} />
        )}
        {activeTab === 'rates' && <RateCardScreen token={session.token} />}
        {activeTab === 'wallet' && <WalletScreen token={session.token} />}
        {activeTab === 'scan' && <QRScannerScreen token={session.token} />}
      </View>

      <View className="min-h-[72px] flex-row px-2 pt-1.5 pb-1 bg-surface border-t border-border" accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              className={`flex-1 min-h-[56px] items-center justify-center rounded-2xl gap-[2px] active:opacity-[0.72] ${active ? 'bg-leaf-soft' : ''}`}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={23}
                color={active ? colors.leafDark : colors.muted}
              />
              <Text className={`text-[11px] font-bold ${active ? 'text-leaf-dark' : 'text-muted'}`}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
