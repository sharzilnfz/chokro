// AppShell is the root navigator: it restores any saved session, shows the
// login/signup flow when signed out, and hosts the role-based tab shell plus sub-screens.
import React, { useEffect, useMemo, useState } from 'react';
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
import { usePartnerMe } from '@/hooks/usePartnerMe';
import { useProfile } from '@/hooks/useProfile';
import { getPersonaLabel, getVisibleTabs, type PersonaLabel, type Tab } from '@/navigation/roleTabs';
import type { ListingPrefill } from '@/types';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateListingScreen } from '@/screens/CreateListingScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { QRScannerScreen } from '@/screens/QRScannerScreen';
import { RateCardScreen } from '@/screens/RateCardScreen';
import { VisionScanScreen } from '@/screens/VisionScanScreen';
import { PickupScreen } from '@/screens/PickupScreen';
import { AuctionsScreen } from '@/screens/AuctionsScreen';
import { MessagesScreen, type MessagesTarget } from '@/screens/MessagesScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MyBadgesScreen } from '@/screens/MyBadgesScreen';
import { BecomePartnerScreen } from '@/screens/BecomePartnerScreen';
import { PartnerStatusScreen } from '@/screens/PartnerStatusScreen';
import { PartnerConsoleScreen } from '@/screens/PartnerConsoleScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RedemptionRequestScreen } from '@/screens/RedemptionRequestScreen';
import { DepositFlowScreen } from '@/screens/DepositFlowScreen';
import { CATEGORIES } from '@chokro/shared';
import type { FeedFilter } from '@/hooks/useFeed';
import type { DropZone } from '@/components/DropZoneResultCard';

const TAB_META: Record<
  Tab,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  browse: { label: 'Browse', icon: 'compass-outline', activeIcon: 'compass' },
  list: { label: 'List', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  messages: { label: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  pickup: { label: 'Pickup', icon: 'navigate-outline', activeIcon: 'navigate' },
  auctions: { label: 'Auctions', icon: 'hammer-outline', activeIcon: 'hammer' },
  vision: { label: 'AI Scan', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  rates: { label: 'Rates', icon: 'pricetag-outline', activeIcon: 'pricetag' },
  wallet: { label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
  scan: { label: 'Scan', icon: 'scan-outline', activeIcon: 'scan' },
  console: { label: 'Console', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
};

const PERSONA_CHIPS: Record<PersonaLabel, { chipClass: string; textClass: string }> = {
  Collector: { chipClass: 'bg-leaf-soft', textClass: 'text-leaf-dark' },
  Recycler: { chipClass: 'bg-amber-soft', textClass: 'text-amber' },
  Partner: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
  Admin: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
  Individual: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
};

type SubView =
  | 'leaderboard'
  | 'badges'
  | 'partner_status'
  | 'become_partner'
  | 'partner_console'
  | 'profile'
  | 'redemption'
  | 'deposit_flow'
  | null;

export function AppShell() {
  const { session, restoreState, restoreError, authMode, setAuthMode, logout, retryRestore, clearAndRestart } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [subView, setSubView] = useState<SubView>(null);
  const [listingPrefill, setListingPrefill] = useState<ListingPrefill | null>(null);
  const [messagesTarget, setMessagesTarget] = useState<MessagesTarget | null>(null);
  const [browseCategory, setBrowseCategory] = useState<FeedFilter | null>(null);
  const [depositZone, setDepositZone] = useState<DropZone | null>(null);
  const [depositQrToken, setDepositQrToken] = useState<string>('');

  const partnerQuery = usePartnerMe();
  const { data: profileData } = useProfile(Boolean(session));

  const role = session?.user.role ?? 'INDIVIDUAL';
  const partnerTypes = role === 'PARTNER' && partnerQuery.data ? partnerQuery.data.types : null;
  const isVerifiedPartner = Boolean(partnerQuery.data && partnerQuery.data.status === 'VERIFIED');
  const visibleTabs = useMemo(() => getVisibleTabs(role, partnerTypes), [role, partnerTypes]);
  const personaLabel = getPersonaLabel(role, partnerTypes);
  const campusTag = profileData?.user.campusName ?? profileData?.user.institutionId ?? null;

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeTab]);

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
          setSubView(null);
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

  const selectTab = (tab: Tab) => {
    const next = visibleTabs.includes(tab) ? tab : visibleTabs[0];
    if (next !== 'list') setListingPrefill(null);
    setSubView(null);
    setActiveTab(next);
  };

  const openChatWithListing = (target: MessagesTarget) => {
    setMessagesTarget(target);
    setSubView(null);
    setActiveTab('messages');
  };

  const syncBrowseUrl = (category: FeedFilter) => {
    if (Platform.OS !== 'web' || typeof history === 'undefined') return;
    const path = category === 'ALL' ? '/browse' : `/browse?category=${encodeURIComponent(category)}`;
    history.replaceState(null, '', path);
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

  if (!session) {
    return authMode === 'login' ? (
      <LoginScreen onShowSignup={() => setAuthMode('signup')} />
    ) : (
      <SignupScreen onShowLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header bar */}
      <View className="min-h-[66px] flex-row items-center justify-between px-[18px] border-b border-border bg-background">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-leaf items-center justify-center" accessibilityElementsHidden>
            <Ionicons name="leaf" size={18} color={colors.surface} />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-ink text-lg font-extrabold tracking-tight">Chokro</Text>
              <View
                accessible
                accessibilityLabel={`Account type: ${personaLabel}`}
                className={`rounded-full px-2 py-[2px] ${PERSONA_CHIPS[personaLabel]?.chipClass ?? 'bg-surface-muted'}`}
              >
                <Text className={`text-[10px] font-bold ${PERSONA_CHIPS[personaLabel]?.textClass ?? 'text-muted'}`}>
                  {personaLabel}
                </Text>
              </View>
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

      {/* Screen container */}
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
              selectTab('scan');
            }}
            onOpenStatus={() => setSubView('partner_status')}
          />
        ) : subView === 'redemption' ? (
          <RedemptionRequestScreen
            onBack={() => setSubView(null)}
            onSuccess={() => setSubView(null)}
          />
        ) : subView === 'deposit_flow' ? depositZone ? (
          <DepositFlowScreen
            zoneId={depositZone.id}
            zoneName={depositZone.name}
            acceptedCategories={depositZone.acceptedCategories}
            qrToken={depositQrToken}
            onComplete={() => {
              setSubView(null);
              setDepositZone(null);
              setDepositQrToken('');
            }}
            onCancel={() => {
              setSubView(null);
              setDepositZone(null);
              setDepositQrToken('');
            }}
          />
        ) : null : (
          <>
            {activeTab === 'browse' && (
              <FeedScreen
                onContactSeller={openChatWithListing}
                deepLinkCategory={browseCategory}
                onCategoryChange={syncBrowseUrl}
              />
            )}
            {activeTab === 'list' && (
              <CreateListingScreen
                key={listingPrefill ? `prefill-${listingPrefill.seededAt}` : 'blank'}
                prefill={listingPrefill}
                onCreated={() => {
                  setListingPrefill(null);
                  setActiveTab('browse');
                }}
              />
            )}
            {activeTab === 'messages' && (
              <MessagesScreen
                target={messagesTarget}
                onTargetHandled={() => setMessagesTarget(null)}
              />
            )}
            {activeTab === 'pickup' && <PickupScreen />}
            {activeTab === 'auctions' && <AuctionsScreen />}
            {activeTab === 'rates' && <RateCardScreen />}
            {activeTab === 'wallet' && (
              <WalletScreen
                onOpenLeaderboard={() => setSubView('leaderboard')}
                onOpenBadges={() => setSubView('badges')}
                onOpenPartner={() => setSubView(isVerifiedPartner ? 'partner_console' : 'partner_status')}
                onOpenRedemption={() => setSubView('redemption')}
              />
            )}

            {activeTab === 'vision' && (
              <VisionScanScreen
                onListScrap={(prefill) => {
                  setListingPrefill(prefill);
                  selectTab('list');
                }}
              />
            )}
            {activeTab === 'scan' && (
              <QRScannerScreen
                onZoneConfirmed={(zone, qrToken) => {
                  setDepositZone(zone);
                  setDepositQrToken(qrToken);
                  setSubView('deposit_flow');
                }}
              />
            )}
            {activeTab === 'console' && (
              <PartnerConsoleScreen
                onOpenScanner={() => {
                  setSubView(null);
                  selectTab('scan');
                }}
                onOpenStatus={() => setSubView('partner_status')}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom tab bar */}
      <View className="min-h-[72px] flex-row px-2 pt-1.5 pb-1 bg-surface border-t border-border" accessibilityRole="tablist">
        {visibleTabs.map((key) => {
          const tab = TAB_META[key];
          if (!tab) return null;
          const active = activeTab === key && subView === null;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              className={`flex-1 min-h-[56px] items-center justify-center rounded-2xl gap-[2px] active:opacity-[0.72] ${active ? 'bg-leaf-soft' : ''}`}
              onPress={() => selectTab(key)}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.leafDark : colors.muted}
              />
              <Text className={`text-[10px] font-bold ${active ? 'text-leaf-dark' : 'text-muted'}`}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}