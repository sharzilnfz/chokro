import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
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
      <SafeAreaView style={styles.centeredPage}>
        <View style={styles.mark} accessibilityElementsHidden>
          <Ionicons name="leaf" size={25} color={colors.surface} />
        </View>
        <Text style={styles.brand}>Chokro</Text>
        <ActivityIndicator color={colors.leaf} size="large" accessibilityLabel="Restoring session" />
        <Text style={styles.loadingText}>Restoring your secure session</Text>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (restoreState === 'error') {
    return (
      <SafeAreaView style={styles.centeredPage}>
        <View style={styles.restoreCard} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
          <Text style={styles.restoreTitle}>Session check unavailable</Text>
          <Text style={styles.restoreCopy}>{restoreError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry session restoration"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void restoreSession()}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear saved session and sign in"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={async () => {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              setSession(null);
              setRestoreState('ready');
            }}
          >
            <Text style={styles.secondaryButtonText}>Use another account</Text>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.smallMark} accessibilityElementsHidden>
            <Ionicons name="leaf" size={18} color={colors.surface} />
          </View>
          <View>
            <Text style={styles.appTitle}>Chokro</Text>
            <Text style={styles.account} numberOfLines={1}>{session.user.email}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          onPress={() => void handleLogout()}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.leafDark} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {activeTab === 'browse' && <FeedScreen token={session.token} />}
        {activeTab === 'list' && (
          <CreateListingScreen token={session.token} onCreated={() => setActiveTab('browse')} />
        )}
        {activeTab === 'rates' && <RateCardScreen token={session.token} />}
        {activeTab === 'wallet' && <WalletScreen token={session.token} />}
        {activeTab === 'scan' && <QRScannerScreen token={session.token} />}
      </View>

      <View style={styles.navBar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={23}
                color={active ? colors.leafDark : colors.muted}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centeredPage: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brand: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginBottom: 28 },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 14 },
  restoreCard: {
    width: '100%',
    maxWidth: 430,
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  restoreTitle: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 12 },
  restoreCopy: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  primaryButton: {
    minHeight: 50,
    width: '100%',
    borderRadius: 14,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryButtonText: { color: colors.leafDark, fontSize: 15, fontWeight: '700' },
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  logoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  account: { color: colors.muted, fontSize: 11, marginTop: 1, maxWidth: 220 },
  logoutButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  body: { flex: 1 },
  navBar: {
    minHeight: 72,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 2,
  },
  navItemActive: { backgroundColor: colors.leafSoft },
  navLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  navLabelActive: { color: colors.leafDark },
  pressed: { opacity: 0.72 },
});
