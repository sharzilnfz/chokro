// CertificateViewScreen (M17): Public SHA-256 Signed ESG Sustainability Certificate Viewer
import React from 'react';
import {
  ScrollView,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useCertificate } from '@/hooks/useImpact';
import { getErrorMessage } from '@/services/api';

interface CertificateViewScreenProps {
  certificateRef: string;
  onBack?: () => void;
}

export function CertificateViewScreen({ certificateRef, onBack }: CertificateViewScreenProps) {
  const { data: cert, isLoading, error, refetch, isRefetching } = useCertificate(certificateRef);

  const handleShare = async () => {
    if (!cert) return;
    try {
      const shareUrl = `https://chokro.org/certificates/${cert.certificateRef}`;
      await Share.share({
        title: `ESG Sustainability Certificate | ${cert.institutionName}`,
        message: `Official ESG Sustainability Certificate for ${cert.institutionName}: ${cert.totalMassKg} kg diverted, ${cert.totalCo2eKg} kg CO₂e avoided. Verified on Chokro: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.warn('Share dismissed or failed', err);
    }
  };

  const periodStartStr = cert?.periodStart
    ? new Date(cert.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const periodEndStr = cert?.periodEnd
    ? new Date(cert.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const issuedAtStr = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Verifying ESG certificate"
      loadingSubtitle="Validating cryptographic SHA-256 signature hash."
      error={!cert ? error : null}
      errorTitle="Certificate unavailable"
      errorMessage={error ? getErrorMessage(error, 'Could not verify sustainability certificate.') : ''}
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
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
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
            <Text className="text-leaf text-xs font-extrabold tracking-widest uppercase">
              ESG CERTIFICATE (M17)
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share certificate"
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf active:opacity-70"
            onPress={() => void handleShare()}
          >
            <Ionicons name="share-social-outline" size={14} color={colors.surface} />
            <Text className="text-xs font-bold text-surface">Share</Text>
          </Pressable>
        </View>

        {/* Certificate Formal Document Card */}
        <View className="bg-surface border-2 border-leaf rounded-3xl p-6 shadow-card mb-5">
          {/* Badge & Reference */}
          <View className="flex-row items-center justify-between border-b border-border pb-4 mb-4">
            <View>
              <Text className="text-[10px] font-black text-leaf-dark uppercase tracking-wider">
                CHOKRO CIRCULAR NETWORK
              </Text>
              <Text className="text-xl font-black text-ink mt-0.5">
                Sustainability Certificate
              </Text>
            </View>
            <View className="bg-leaf px-2.5 py-1 rounded-lg">
              <Text className="text-[10px] font-black text-surface uppercase">VERIFIED</Text>
            </View>
          </View>

          {/* Reference Pill */}
          <View className="bg-background border border-border p-3 rounded-xl mb-4">
            <Text className="text-[10px] font-bold text-muted uppercase">Public Reference Token</Text>
            <Text className="text-xs font-mono font-bold text-ink mt-0.5">{cert?.certificateRef}</Text>
          </View>

          {/* Institution & Period */}
          <View className="mb-4">
            <Text className="text-xs text-muted">Issued to</Text>
            <Text className="text-lg font-extrabold text-ink">{cert?.institutionName}</Text>
            <Text className="text-xs text-muted mt-1">
              Reporting Period: <Text className="font-bold text-ink">{periodStartStr} — {periodEndStr}</Text>
            </Text>
            <Text className="text-xs text-muted">
              Issued At: <Text className="font-bold text-ink">{issuedAtStr}</Text>
            </Text>
          </View>

          {/* Totals Box */}
          <View className="bg-leaf-soft/50 border border-leaf/30 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[10px] font-extrabold text-leaf-dark uppercase">Total Diverted Mass</Text>
                <Text className="text-2xl font-black text-ink mt-0.5">{cert?.totalMassKg.toFixed(2)} kg</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] font-extrabold text-leaf-dark uppercase">Avoided GHG Emissions</Text>
                <Text className="text-2xl font-black text-leaf-dark mt-0.5">
                  {cert?.totalCo2eKg.toFixed(3)} kg CO₂e
                </Text>
              </View>
            </View>

            <View className="border-t border-leaf/20 pt-2 flex-row justify-between">
              <Text className="text-[11px] text-muted">
                Frozen Record Set: <Text className="font-bold text-ink">{cert?.recordCount} custody events</Text>
              </Text>
              <Text className="text-[11px] text-muted">
                Factor Version: <Text className="font-bold text-ink">{cert?.methodology.factorVersion}</Text>
              </Text>
            </View>
          </View>

          {/* Stated Uncertainty Range */}
          {cert?.methodology.uncertaintyRange && (
            <View className="bg-background border border-border p-3.5 rounded-xl mb-4">
              <Text className="text-[10px] font-extrabold text-ink uppercase tracking-wider mb-1">
                Stated Uncertainty Range (ISO 14044)
              </Text>
              <Text className="text-xs font-semibold text-muted">
                Estimate basis: {cert.totalCo2eKg.toFixed(2)} kg CO₂e (95% CI:{' '}
                {cert.methodology.uncertaintyRange.rangeLowCo2eKg.toFixed(2)} —{' '}
                {cert.methodology.uncertaintyRange.rangeHighCo2eKg.toFixed(2)} kg CO₂e)
              </Text>
            </View>
          )}

          {/* Category Breakdown */}
          {cert?.breakdown.byCategory && cert.breakdown.byCategory.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2">
                Mass Diverted by Category
              </Text>
              {cert.breakdown.byCategory.map((c) => (
                <View key={c.category} className="flex-row items-center justify-between py-1 border-b border-border/40">
                  <Text className="text-xs text-ink">{c.category}</Text>
                  <Text className="text-xs font-bold text-ink">{c.massKg.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>
          )}

          {/* Next-Life Path Breakdown */}
          {cert?.breakdown.byPath && cert.breakdown.byPath.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2">
                Next-Life Disposition
              </Text>
              {cert.breakdown.byPath.map((p) => (
                <View key={p.path} className="flex-row items-center justify-between py-1 border-b border-border/40">
                  <Text className="text-xs text-ink">{p.path}</Text>
                  <Text className="text-xs font-bold text-leaf-dark">{p.massKg.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>
          )}

          {/* Cryptographic Signature Hash */}
          <View className="bg-background border border-border p-3 rounded-xl mt-2">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="shield-checkmark" size={14} color={colors.leafDark} />
              <Text className="text-[10px] font-extrabold text-ink uppercase">SHA-256 Signature Hash</Text>
            </View>
            <Text className="text-[10px] font-mono text-muted break-all leading-4">
              {cert?.signatureHash}
            </Text>
          </View>
        </View>

        {/* Privacy & Methodology Footer Notice */}
        <View className="p-4 rounded-2xl bg-surface border border-border">
          <View className="flex-row items-start gap-2.5">
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Public Verifier Privacy Guarantee</Text>
              <Text className="text-[11px] text-muted leading-4 mt-0.5">
                This public verification view resolves totals and frozen methodology without exposing any personal student
                or employee member data.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </StateView>
  );
}
