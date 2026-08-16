import React, { useEffect, useMemo, useState } from 'react';
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
import { usePartnerMe } from '@/hooks/usePartnerMe';
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
import { LoginScreen } from '@/screens/LoginScreen';
import { SignupScreen } from '@/screens/SignupScreen';

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
  pickup: { label: 'Pickup', icon: 'navigate-outline', activeIcon: 'navigate' },
  auctions: { label: 'Auctions', icon: 'hammer-outline', activeIcon: 'hammer' },
  vision: { label: 'AI Scan', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  rates: { label: 'Rates', icon: 'pricetag-outline', activeIcon: 'pricetag' },
  wallet: { label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
  scan: { label: 'Scan', icon: 'scan-outline', activeIcon: 'scan' },
};

const PERSONA_CHIPS: Record<PersonaLabel, { chipClass: string; textClass: string }> = {
  Collector: { chipClass: 'bg-leaf-soft', textClass: 'text-leaf-dark' },
  Recycler: { chipClass: 'bg-amber-soft', textClass: 'text-amber' },
  Partner: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
  Admin: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
  Individual: { chipClass: 'bg-surface-muted', textClass: 'text-muted' },
};

export function AppShell() {
  const { session, restoreState, restoreError, authMode, setAuthMode, logout, retryRestore, clearAndRestart } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [listingPrefill, setListingPrefill] = useState<ListingPrefill | null>(null);
  const partnerQuery = usePartnerMe();

  const role = session?.user.role ?? 'INDIVIDUAL';
  // While a PARTNER's profile is loading (or missing), types are unknown and the
  // helper falls back to the PARTNER superset tab set — no separate loading UI needed.
  const partnerTypes = role === 'PARTNER' && partnerQuery.data ? partnerQuery.data.types : null;
  const visibleTabs = useMemo(() => getVisibleTabs(role, partnerTypes), [role, partnerTypes]);
  const personaLabel = getPersonaLabel(role, partnerTypes);

  // If the active tab disappears from the visible set (e.g. re-login as another
  // role), reset to the first visible tab. Runs at most once per set change: the
  // fallback is always a member of visibleTabs, so this cannot loop.
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeTab]);

  const selectTab = (tab: Tab) => {
    const next = visibleTabs.includes(tab) ? tab : visibleTabs[0];
    if (next !== 'list') setListingPrefill(null);
    setActiveTab(next);
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
      <View className="min-h-[66px] flex-row items-center justify-between px-[18px] border-b border-border bg-background">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="w-9 h-9 rounded-xl bg-leaf items-center justify-center" accessibilityElementsHidden>
            <Ionicons name="leaf" size={18} color={colors.surface} />
          </View>
          <View>
            <Text className="text-ink text-lg font-extrabold tracking-tight">Chokro</Text>
            <View className="flex-row items-center gap-1.5 mt-[1px]">
              <Text className="text-muted text-[11px] max-w-[180px]" numberOfLines={1}>{session.user.email}</Text>
              <View
                accessible
                accessibilityLabel={`Account type: ${personaLabel}`}
                className={`rounded-full px-2 py-[2px] ${PERSONA_CHIPS[personaLabel].chipClass}`}
              >
                <Text className={`text-[10px] font-bold ${PERSONA_CHIPS[personaLabel].textClass}`}>
                  {personaLabel}
                </Text>
              </View>
            </View>
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

      <View className="flex-1">
        {activeTab === 'browse' && <FeedScreen />}
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
        {activeTab === 'rates' && <RateCardScreen />}
        {activeTab === 'pickup' && <PickupScreen />}
        {activeTab === 'auctions' && <AuctionsScreen />}
        {activeTab === 'wallet' && <WalletScreen />}
        {activeTab === 'vision' && (
          <VisionScanScreen
            onListScrap={(prefill) => {
              setListingPrefill(prefill);
              // Clamps to the first visible tab if the role has no list tab.
              selectTab('list');
            }}
          />
        )}
        {activeTab === 'scan' && <QRScannerScreen />}
      </View>

      <View className="min-h-[72px] flex-row px-2 pt-1.5 pb-1 bg-surface border-t border-border" accessibilityRole="tablist">
        {visibleTabs.map((key) => {
          const tab = TAB_META[key];
          const active = activeTab === key;
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
