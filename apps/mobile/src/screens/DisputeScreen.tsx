// M15: DisputeScreen — Unified Dispute Arbitration & Resolution Interface (SPEC 13)
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useDisputes, useCreateDispute } from '@/hooks/useDisputes';
import { StateView } from '@/components/ui/StateView';
import type { DisputeSourceType, DisputeDto } from '@chokro/shared';

export interface DisputeScreenProps {
  sourceType?: DisputeSourceType;
  sourceId?: string;
  againstUserId?: string;
  onBack?: () => void;
}

export function DisputeScreen({
  sourceType = 'AUCTION_LOT',
  sourceId,
  againstUserId,
  onBack,
}: DisputeScreenProps) {
  const { user } = useAuth();
  const { data: disputes, isLoading, refetch, isRefetching } = useDisputes();
  const createDispute = useCreateDispute();

  const [isFiling, setIsFiling] = useState(Boolean(sourceId && againstUserId));
  const [selectedSourceType, setSelectedSourceType] = useState<DisputeSourceType>(sourceType);
  const [targetSourceId, setTargetSourceId] = useState(sourceId || '');
  const [targetAgainstUserId, setTargetAgainstUserId] = useState(againstUserId || '');
  const [reason, setReason] = useState('');
  const [evidenceUrlInput, setEvidenceUrlInput] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddEvidence = () => {
    if (!evidenceUrlInput.trim()) return;
    setEvidenceUrls((prev) => [...prev, evidenceUrlInput.trim()]);
    setEvidenceUrlInput('');
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async () => {
    setSubmitError(null);
    if (!reason.trim() || reason.trim().length < 5) {
      setSubmitError('Please provide a detailed reason of at least 5 characters.');
      return;
    }
    if (!targetSourceId.trim() || !targetAgainstUserId.trim()) {
      setSubmitError('Source ID and Counterparty User ID are required.');
      return;
    }

    try {
      await createDispute.mutateAsync({
        sourceType: selectedSourceType,
        sourceId: targetSourceId.trim(),
        againstUserId: targetAgainstUserId.trim(),
        reason: reason.trim(),
        evidenceUrls,
      });
      setIsFiling(false);
      setReason('');
      setEvidenceUrls([]);
      void refetch();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to file dispute.');
    }
  };

  const renderDisputeCard = ({ item }: { item: DisputeDto }) => {
    const isResolved = item.status === 'RESOLVED';
    const isOpen = item.status === 'OPEN';

    return (
      <View className="bg-surface border border-border rounded-[16px] p-[16px] mb-[12px] shadow-xs">
        <View className="flex-row items-center justify-between mb-[8px]">
          <View className="flex-row items-center gap-[6px]">
            <View className="bg-leaf-soft px-[8px] py-[3px] rounded-[6px]">
              <Text className="text-leaf-dark text-[11px] font-extrabold">{item.source_type}</Text>
            </View>
            <Text className="text-muted text-[11px] font-mono">
              #{item.id.slice(0, 8)}
            </Text>
          </View>

          <View
            className={`px-[8px] py-[3px] rounded-pill border ${
              isResolved
                ? 'bg-emerald-50 border-emerald-300'
                : isOpen
                ? 'bg-amber-50 border-amber-300'
                : 'bg-surface-soft border-border'
            }`}
          >
            <Text
              className={`text-[10px] font-extrabold ${
                isResolved
                  ? 'text-emerald-800'
                  : isOpen
                  ? 'text-amber-800'
                  : 'text-muted'
              }`}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text className="text-ink text-[14px] font-bold mb-[6px]">{item.reason}</Text>

        {item.evidence_urls && item.evidence_urls.length > 0 && (
          <View className="flex-row items-center gap-[4px] mb-[8px]">
            <Ionicons name="images-outline" size={14} color={colors.muted} />
            <Text className="text-muted text-[12px]">
              {item.evidence_urls.length} evidence attachment{item.evidence_urls.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {isResolved && (
          <View className="bg-surface-soft border border-border p-[10px] rounded-[10px] mt-[6px]">
            <View className="flex-row items-center gap-[6px] mb-[4px]">
              <Ionicons name="shield-checkmark" size={14} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[12px] font-extrabold">
                Resolution: {item.resolution}
              </Text>
            </View>
            {item.resolution_notes && (
              <Text className="text-ink-soft text-[12px] italic">
                "{item.resolution_notes}"
              </Text>
            )}
          </View>
        )}

        <Text className="text-muted text-[10px] mt-[8px]">
          Opened {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <View className="px-[16px] pt-[16px] pb-[12px] border-b border-border bg-surface flex-row items-center justify-between">
        <View className="flex-row items-center gap-[8px]">
          {onBack && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              className="w-9 h-9 items-center justify-center rounded-full active:opacity-[0.7]"
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </Pressable>
          )}
          <View>
            <Text className="text-ink text-[18px] font-black">Dispute Arbitration</Text>
            <Text className="text-muted text-[12px]">Unified dispute & arbitration queue</Text>
          </View>
        </View>

        <Pressable
          className={`px-[12px] py-[8px] rounded-[10px] ${
            isFiling ? 'bg-surface-soft border border-border' : 'bg-leaf'
          }`}
          onPress={() => setIsFiling(!isFiling)}
        >
          <Text className={`text-[12px] font-extrabold ${isFiling ? 'text-ink' : 'text-white'}`}>
            {isFiling ? 'View List' : 'File Dispute'}
          </Text>
        </Pressable>
      </View>

      {isFiling ? (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text className="text-ink text-[16px] font-extrabold mb-[6px]">Open a New Dispute</Text>
          <Text className="text-muted text-[13px] mb-[16px]">
            Filing a dispute pauses automated settlements and escalates photographic evidence to admin arbitration.
          </Text>

          {/* Source Type Selector */}
          <Text className="text-ink text-[13px] font-bold mb-[6px]">Dispute Category</Text>
          <View className="flex-row gap-[8px] mb-[14px]">
            {(['AUCTION_LOT', 'PICKUP', 'DEPOSIT'] as DisputeSourceType[]).map((st) => (
              <Pressable
                key={st}
                className={`flex-1 py-[10px] rounded-[10px] border items-center justify-center ${
                  selectedSourceType === st
                    ? 'bg-leaf border-leaf'
                    : 'bg-surface border-border'
                }`}
                onPress={() => setSelectedSourceType(st)}
              >
                <Text
                  className={`text-[12px] font-extrabold ${
                    selectedSourceType === st ? 'text-white' : 'text-ink'
                  }`}
                >
                  {st === 'AUCTION_LOT' ? 'Auction Lot' : st === 'PICKUP' ? 'Pickup' : 'Deposit'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Source ID Input */}
          <Text className="text-ink text-[13px] font-bold mb-[6px]">Source Reference ID (UUID)</Text>
          <TextInput
            value={targetSourceId}
            onChangeText={setTargetSourceId}
            placeholder="e.g. lot or pickup UUID"
            className="bg-surface border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-mono text-[13px] mb-[12px]"
          />

          {/* Against User ID */}
          <Text className="text-ink text-[13px] font-bold mb-[6px]">Counterparty User ID</Text>
          <TextInput
            value={targetAgainstUserId}
            onChangeText={setTargetAgainstUserId}
            placeholder="e.g. seller or partner user UUID"
            className="bg-surface border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-mono text-[13px] mb-[12px]"
          />

          {/* Reason */}
          <Text className="text-ink text-[13px] font-bold mb-[6px]">Reason for Dispute</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Describe the discrepancy, contamination, or failure in detail..."
            className="bg-surface border border-border rounded-[10px] px-[12px] py-[10px] text-ink text-[14px] min-h-[90px] mb-[12px]"
          />

          {/* Evidence URLs */}
          <Text className="text-ink text-[13px] font-bold mb-[6px]">Evidence Photo URLs</Text>
          <View className="flex-row gap-[8px] mb-[10px]">
            <TextInput
              value={evidenceUrlInput}
              onChangeText={setEvidenceUrlInput}
              placeholder="https://..."
              className="flex-1 bg-surface border border-border rounded-[10px] px-[12px] py-[10px] text-ink text-[13px]"
            />
            <Pressable
              className="bg-surface-soft border border-border px-[14px] rounded-[10px] items-center justify-center active:opacity-[0.8]"
              onPress={handleAddEvidence}
            >
              <Text className="text-ink font-bold text-[13px]">Add</Text>
            </Pressable>
          </View>

          {evidenceUrls.length > 0 && (
            <View className="gap-[6px] mb-[16px]">
              {evidenceUrls.map((url, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between bg-surface-soft p-[8px] rounded-[8px] border border-border"
                >
                  <Text className="text-ink text-[12px] flex-1 font-mono" numberOfLines={1}>
                    {url}
                  </Text>
                  <Pressable onPress={() => handleRemoveEvidence(idx)}>
                    <Ionicons name="trash-outline" size={16} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {submitError && (
            <View className="bg-rose-50 border border-rose-300 p-[10px] rounded-[10px] mb-[14px]">
              <Text className="text-rose-800 text-[12px] font-bold">{submitError}</Text>
            </View>
          )}

          <Pressable
            className="bg-leaf py-[14px] rounded-[12px] items-center justify-center active:opacity-[0.8] mt-[8px]"
            disabled={createDispute.isPending}
            onPress={handleSubmitDispute}
          >
            {createDispute.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-[14px] font-extrabold">Submit Dispute for Review</Text>
            )}
          </Pressable>
        </ScrollView>
      ) : (
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.leaf} />
              <Text className="text-muted text-[13px] mt-[8px]">Loading disputes...</Text>
            </View>
          ) : !disputes || disputes.length === 0 ? (
            <StateView
              isEmpty
              emptyIcon="shield-checkmark-outline"
              emptyTitle="No active disputes"
              emptyMessage="Any disputes filed by you or counterparties will appear in this list."
              containerClassName="m-[20px] border border-border rounded-md bg-surface"
            />
          ) : (
            <FlatList
              data={disputes}
              keyExtractor={(item) => item.id}
              renderItem={renderDisputeCard}
              contentContainerStyle={{ padding: 16 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={() => void refetch()}
                  colors={[colors.leaf]}
                  tintColor={colors.leaf}
                />
              }
            />
          )}
        </View>
      )}
    </View>
  );
}
