// AppShell is the root navigator: it restores any saved session, shows the
// login/signup flow when signed out, and otherwise hosts the tab shell plus sub-screens.
//
// Imports: UI primitives, icon + status bar, auth context, and all core & sub-screens.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
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
import { useProfile } from '@/hooks/useProfile';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateListingScreen } from '@/screens/CreateListingScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { QRScannerScreen } from '@/screens/QRScannerScreen';
import { RateCardScreen } from '@/screens/RateCardScreen';
import { MessagesScreen, type MessagesTarget } from '@/screens/MessagesScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MyBadgesScreen } from '@/screens/MyBadgesScreen';
import { BecomePartnerScreen } from '@/screens/BecomePartnerScreen';
import { PartnerStatusScreen } from '@/screens/PartnerStatusScreen';
import { PartnerConsoleScreen } from '@/screens/PartnerConsoleScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { CATEGORIES } from '@chokro/shared';
import type { FeedFilter } from '@/hooks/useFeed';

// The destinations the bottom tab bar can select.
// 'messages' is the buyer-seller chat tab; 'console' is a verified-partner-only tab.
type Tab = 'browse' | 'list' | 'rates' | 'wallet' | 'scan' | 'messages' | 'console';

// Modal or sub-screen overlays
type SubView = 'leaderboard' | 'badges' | 'partner_status' | 'become_partner' | 'partner_console' | 'profile' | null;

export function AppShell() {
  // Auth session state plus the shell's currently selected tab and active subview.
  const { session, restoreState, restoreError, authMode, setAuthMode, logout, retryRestore, clearAndRestart } = useAuth();

  const { data: partnerData } = usePartner(Boolean(session));
  const { data: profileData } = useProfile(Boolean(session));
  const partner = partnerData?.partner;
  const isVerifiedPartner = partner?.status === 'VERIFIED';
  const campusTag = profileData?.user.campusName ?? profileData?.user.institutionId ?? null;

  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [subView, setSubView] = useState<SubView>(null);
  const [messagesTarget, setMessagesTarget] = useState<MessagesTarget | null>(null);
  const [browseCategory, setBrowseCategory] = useState<FeedFilter | null>(null);

  // Restore a feed filtered from a deep link (e.g. exp://.../browse?category=PLASTICS).
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const isBrowse = parsed.hostname === 'browse' || parsed.pathname === '/browse';
        if (!isBrowse) return;
        const cat = parsed.searchParams.get('category');
        if (cat && (cat === 'ALL' || (CATEGORIES as readonly string[]).includes(cat))) {
          setBrowseCategory(cat as FeedFilter);
          setActiveTab('browse');
        }
      } catch {
        // ignore malformed deep links
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL().then(handleUrl);
    return () => subscription.remove();
  }, []);

  // Open the Messages tab targeting an existing listing conversation.
  const openChatWithListing = (target: MessagesTarget) => {
    setMessagesTarget(target);
    setActiveTab('messages');
  };

  // Sync the chosen feed category into the web URL so it is shareable.
  const syncBrowseUrl = (category: FeedFilter) => {
    if (Platform.OS !== 'web' || typeof history === 'undefined') return;
    const path = category === 'ALL' ? '/browse' : `/browse?category=${encodeURIComponent(category)}`;
    history.replaceState(null, '', path);
  };

  // Dynamic tabs: verified partners get the dedicated "Console" tab in the bottom bar.
  const visibleTabs: Array<{
    key: Tab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'browse', label: 'Browse', icon: 'compass-outline', activeIcon: 'compass' },
    { key: 'list', label: 'List', icon: 'add-circle-outline', activeIcon: 'add-circle' },
    { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => setSubView('profile')}
            >
              <View className="flex-row items-center gap-1.5 mt-[1px]">
                <Text className="text-muted text-[11px] max-w-[160px]" numberOfLines={1}>
                  {session.user.email}
                </Text>
                {campusTag ? (
                  <View className="px-1.5 py-0.5 rounded bg-leaf-soft border border-leaf/40">
                    <Text className="text-[9px] font-black text-leaf-dark" numberOfLines={1}>
                      {campusTag}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
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
        {subView === 'profile' ? (
          <ProfileScreen onBack={() => setSubView(null)} />
        ) : subView === 'leaderboard' ? (
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
            {activeTab === 'browse' && <FeedScreen onContactSeller={openChatWithListing} deepLinkCategory={browseCategory} onCategoryChange={syncBrowseUrl} />}
            {activeTab === 'list' && (
              <CreateListingScreen onCreated={() => setActiveTab('browse')} />
            )}
            {activeTab === 'messages' && (
              <MessagesScreen target={messagesTarget} onTargetHandled={() => setMessagesTarget(null)} />
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