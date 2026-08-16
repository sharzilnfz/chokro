// AppShell is the root navigator: it restores any saved session, shows the
// login/signup flow when signed out, and otherwise hosts the tab shell plus sub-screens.

// Imports: UI primitives, icon + status bar, auth context, and all core & sub-screens.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { usePartner } from '@/hooks/usePartner';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateListingScreen } from '@/screens/CreateListingScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { QRScannerScreen } from '@/screens/QRScannerScreen';
import { RateCardScreen } from '@/screens/RateCardScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MyBadgesScreen } from '@/screens/MyBadgesScreen';
import { BecomePartnerScreen } from '@/screens/BecomePartnerScreen';
import { PartnerStatusScreen } from '@/screens/PartnerStatusScreen';
import { PartnerConsoleScreen } from '@/screens/PartnerConsoleScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SignupScreen } from '@/screens/SignupScreen';

// The destinations the bottom tab bar can select (Console dynamically available to verified partners).
type Tab = 'browse' | 'list' | 'console' | 'rates' | 'wallet' | 'scan';

// Modal or sub-screen overlays
type SubView = 'leaderboard' | 'badges' | 'partner_status' | 'become_partner' | 'partner_console' | null;

export function AppShell() {
  // Auth session state plus the shell's currently selected tab and active subview.
  const { session, restoreState, restoreError, authMode, setAuthMode, logout, retryRestore, clearAndRestart } = useAuth();
  const { data: partnerData } = usePartner();
  const partner = partnerData?.partner;
  const isVerifiedPartner = partner?.status === 'VERIFIED';

  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [subView, setSubView] = useState<SubView>(null);

  // Dynamic tabs: verified partners get the dedicated "Console" tab in the bottom bar
  const visibleTabs: Array<{
    key: Tab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'browse', label: 'Browse', icon: 'compass-outline', activeIcon: 'compass' },
    { key: 'list', label: 'List', icon: 'add-circle-outline', activeIcon: 'add-circle' },
    ...(isVerifiedPartner
      ? [
          {
            key: 'console' as Tab,
            label: 'Console',
            icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
            activeIcon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap,
          },
        ]
      : []),
    { key: 'rates', label: 'Rates', icon: 'pricetag-outline', activeIcon: 'pricetag' },
    { key: 'wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
    { key: 'scan', label: 'Scan', icon: 'scan-outline', activeIcon: 'scan' },
  ];

  // Full-screen brand splash while the persisted session is being restored.
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

  // Restore failed: offer to retry or drop the saved session for another account.
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
            onPress={retryRestore}
          >
            <Text className="text-surface text-base font-extrabold">Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear saved session and sign in"
            className="min-h-[48px] items-center justify-center mt-1.5 active:opacity-[0.72]"
            onPress={clearAndRestart}
          >
            <Text className="text-leaf-dark text-[15px] font-bold">Use another account</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  // No session: show login or signup depending on which mode was last chosen.
  if (!session) {
    return authMode === 'login' ? (
      <LoginScreen onShowSignup={() => setAuthMode('signup')} />
    ) : (
      <SignupScreen onShowLogin={() => setAuthMode('login')} />
    );
  }

  return (
    // Signed-in layout: app header, active tab screen or subview, then the bottom tab bar.
    <SafeAreaView className="flex-1 bg-background">
      {/* Header bar: brand + signed-in email + partner role badge, with a sign-out action. */}
      <View className="min-h-[66px] flex-row items-center justify-between px-[18px] border-b border-border bg-background">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-leaf items-center justify-center" accessibilityElementsHidden>
            <Ionicons name="leaf" size={18} color={colors.surface} />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-ink text-lg font-extrabold tracking-tight">Chokro</Text>
              {isVerifiedPartner ? (
                <View className="px-2 py-0.5 rounded-md bg-leaf flex-row items-center gap-1">
                  <Ionicons name="shield-checkmark" size={10} color={colors.surface} />
                  <Text className="text-surface text-[9px] font-black tracking-wide">PARTNER</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-muted text-[11px] mt-[1px] max-w-[220px]" numberOfLines={1}>{session.user.email}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
          className="w-12 h-12 items-center justify-center rounded-[14px] active:opacity-[0.72]"
          onPress={() => void logout()}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.leafDark} />
        </Pressable>
      </View>

      {/* Screen container: renders active sub-view if set, or active tab */}
      <View className="flex-1">
        {subView === 'leaderboard' ? (
          <LeaderboardScreen
            onBack={() => setSubView(null)}
            onOpenBadges={() => setSubView('badges')}
          />
        ) : subView === 'badges' ? (
          <MyBadgesScreen
            onBack={() => setSubView(null)}
            onOpenLeaderboard={() => setSubView('leaderboard')}
          />
        ) : subView === 'become_partner' ? (
          <BecomePartnerScreen
            onBack={() => setSubView(null)}
            onSuccess={() => setSubView(isVerifiedPartner ? 'partner_console' : 'partner_status')}
          />
        ) : subView === 'partner_status' ? (
          <PartnerStatusScreen
            onBack={() => setSubView(null)}
            onOpenApply={() => setSubView('become_partner')}
            onOpenConsole={() => setSubView('partner_console')}
          />
        ) : subView === 'partner_console' ? (
          <PartnerConsoleScreen
            onBack={() => setSubView(null)}
            onOpenScanner={() => {
              setSubView(null);
              setActiveTab('scan');
            }}
            onOpenStatus={() => setSubView('partner_status')}
          />
        ) : (
          <>
            {activeTab === 'browse' && <FeedScreen />}
            {activeTab === 'list' && (
              <CreateListingScreen onCreated={() => setActiveTab('browse')} />
            )}
            {activeTab === 'console' && (
              <PartnerConsoleScreen
                onOpenScanner={() => {
                  setSubView(null);
                  setActiveTab('scan');
                }}
                onOpenStatus={() => setSubView('partner_status')}
              />
            )}
            {activeTab === 'rates' && <RateCardScreen />}
            {activeTab === 'wallet' && (
              <WalletScreen
                onOpenLeaderboard={() => setSubView('leaderboard')}
                onOpenBadges={() => setSubView('badges')}
                onOpenPartner={() => setSubView(isVerifiedPartner ? 'partner_console' : 'partner_status')}
              />
            )}
            {activeTab === 'scan' && <QRScannerScreen />}
          </>
        )}
      </View>

      {/* Bottom tab bar mapping destinations, highlighting active one */}
      <View className="min-h-[72px] flex-row px-2 pt-1.5 pb-1 bg-surface border-t border-border" accessibilityRole="tablist">
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.key && subView === null;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              className={`flex-1 min-h-[56px] items-center justify-center rounded-2xl gap-[2px] active:opacity-[0.72] ${active ? 'bg-leaf-soft' : ''}`}
              onPress={() => {
                setSubView(null);
                setActiveTab(tab.key);
              }}
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
