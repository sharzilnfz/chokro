// PartnerStatusScreen displays the real-time review state of a partner application, including rejection feedback notes.
import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { usePartner } from '@/hooks/usePartner';
import { getErrorMessage } from '@/services/api';

interface PartnerStatusScreenProps {
  onBack?: () => void;
  onOpenApply?: () => void;
  onOpenConsole?: () => void;
}

export function PartnerStatusScreen({ onBack, onOpenApply, onOpenConsole }: PartnerStatusScreenProps) {
  const { data, isLoading, error, refetch, isRefetching } = usePartner();
  const partner = data?.partner;

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Checking partner status"
      loadingSubtitle="Retrieving verification state."
      error={error ? error : null}
      errorTitle="Status check unavailable"
      errorMessage={error ? getErrorMessage(error, 'Could not retrieve partner status.') : ''}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-5 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        {/* Header and back navigation */}
        <View className="flex-row items-center gap-2 mb-2">
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              className="w-9 h-9 items-center justify-center rounded-xl bg-surface border border-border active:opacity-70"
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
          )}
          <Text className="text-leaf text-xs font-extrabold tracking-widest">PARTNER HUB</Text>
        </View>

        <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
          Partner Verification Status
        </Text>
        <Text className="text-sm text-muted leading-5 mb-5">
          Track your recycling partner onboarding application and DoE regulatory authorization.
        </Text>

        {!partner ? (
          // No application submitted yet
          <View className="bg-surface border border-border p-6 rounded-3xl items-center text-center">
            <View className="w-16 h-16 rounded-2xl bg-leaf-soft items-center justify-center mb-3">
              <Ionicons name="business-outline" size={32} color={colors.leafDark} />
            </View>
            <Text className="text-lg font-extrabold text-ink mb-1">No Partner Application Found</Text>
            <Text className="text-xs text-muted text-center leading-5 mb-5">
              You have not submitted a recycling partner application yet. Register your organization to start receiving collections.
            </Text>
            {onOpenApply && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply as partner"
                className="w-full min-h-[48px] rounded-xl bg-leaf items-center justify-center active:opacity-75"
                onPress={onOpenApply}
              >
                <Text className="text-surface font-extrabold text-sm">Apply to Become a Partner</Text>
              </Pressable>
            )}
          </View>
        ) : partner.status === 'VERIFIED' ? (
          // Verified Partner Card
          <View className="space-y-4">
            <View className="bg-leaf-dark p-6 rounded-3xl shadow-card">
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-12 h-12 rounded-2xl bg-leaf items-center justify-center">
                  <Ionicons name="shield-checkmark" size={26} color={colors.surface} />
                </View>
                <View className="bg-emerald-800/80 border border-emerald-500/40 px-3 py-1 rounded-full">
                  <Text className="text-xs font-black text-emerald-200">VERIFIED PARTNER</Text>
                </View>
              </View>

              <Text className="text-2xl font-black text-white mb-1">{partner.org_name}</Text>
              <Text className="text-xs text-emerald-200">Authorized Circular Economy Partner</Text>

              {partner.e_waste_licensed && (
                <View className="flex-row items-center gap-1.5 mt-4 pt-3 border-t border-emerald-800 bg-emerald-950/40 -mx-2 px-3 py-2 rounded-xl">
                  <Ionicons name="hardware-chip" size={16} color="#FCD34D" />
                  <Text className="text-xs font-bold text-amber-300">
                    Licensed E-Waste Facility (DoE Authorized)
                  </Text>
                </View>
              )}
            </View>

            {/* Launch Partner Console CTA */}
            {onOpenConsole && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Partner Console"
                className="min-h-[50px] rounded-2xl bg-leaf items-center justify-center flex-row gap-2 active:opacity-80 shadow-sm"
                onPress={onOpenConsole}
              >
                <Ionicons name="apps" size={18} color={colors.surface} />
                <Text className="text-surface font-extrabold text-sm">Launch Partner Console</Text>
              </Pressable>
            )}

            {/* Capabilities Summary */}
            <View className="bg-surface border border-border p-5 rounded-2xl">
              <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-3">
                Active Capabilities & Types
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {partner.types.map((type) => (
                  <View key={type} className="bg-leaf-soft px-3 py-1.5 rounded-xl border border-leaf/30">
                    <Text className="text-xs font-bold text-leaf-dark">{type.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>

              {partner.capability_flags && (
                <View className="space-y-1.5 pt-2 border-t border-border">
                  {Object.entries(partner.capability_flags)
                    .filter(([_, enabled]) => Boolean(enabled))
                    .map(([key]) => (
                      <View key={key} className="flex-row items-center gap-2">
                        <Ionicons name="checkmark-circle" size={16} color={colors.leaf} />
                        <Text className="text-xs font-medium text-ink capitalize">
                          {key.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </View>
        ) : partner.status === 'REJECTED' ? (
          // Rejected Partner Card with feedback notes
          <View className="space-y-4">
            <View className="bg-danger-soft border border-danger/40 p-5 rounded-3xl">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-xl bg-danger/20 items-center justify-center">
                  <Ionicons name="alert-circle" size={24} color={colors.danger} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-danger">Application Needs Review</Text>
                  <Text className="text-xs text-muted">{partner.org_name}</Text>
                </View>
              </View>

              <View className="bg-surface/80 p-3.5 rounded-2xl border border-danger/20 mb-4">
                <Text className="text-xs font-bold text-ink mb-1">Feedback from Admin Team:</Text>
                <Text className="text-xs text-ink leading-5 font-medium">
                  {partner.reason || 'Your application did not meet the verification requirements at this time.'}
                </Text>
              </View>

              {onOpenApply && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Re-apply as partner"
                  className="min-h-[46px] rounded-xl bg-danger items-center justify-center active:opacity-75"
                  onPress={onOpenApply}
                >
                  <Text className="text-surface font-extrabold text-sm">Update and Re-Apply</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          // Application Under Review
          <View className="bg-surface border border-border p-6 rounded-3xl items-center text-center">
            <View className="w-16 h-16 rounded-2xl bg-amber-soft items-center justify-center mb-3">
              <Ionicons name="time-outline" size={32} color={colors.amber} />
            </View>
            <Text className="text-lg font-extrabold text-ink mb-1">Application Under Review</Text>
            <Text className="text-sm font-bold text-leaf-dark mb-2">{partner.org_name}</Text>
            <Text className="text-xs text-muted text-center leading-5 mb-4">
              Your application was submitted on{' '}
              {new Date(partner.created_at).toLocaleDateString('en-GB')}. Chokro platform administrators are reviewing your documents and regulatory licensing.
            </Text>

            <View className="w-full bg-background p-3.5 rounded-2xl border border-border">
              <Text className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Requested Classifications
              </Text>
              <Text className="text-xs font-semibold text-ink">
                {partner.types.map((t) => t.replace(/_/g, ' ')).join(', ')}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </StateView>
  );
}
