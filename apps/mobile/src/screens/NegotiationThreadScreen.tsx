// M12: NegotiationThreadScreen — Binding Counter-Offer Negotiation Engine (SPEC 18)
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { categoryLabel } from '@/types';
import {
  useNegotiationThread,
  useSubmitCounterOffer,
  useAcceptOffer,
  useRejectOffer,
  type NegotiationOffer,
  type NegotiationThread,
} from '@/hooks/useNegotiations';
import { StateView } from '@/components/ui/StateView';

function formatTimeLeft(msLeft: number): string {
  if (msLeft <= 0) return 'Expired';
  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function OfferHistoryTimeline({
  offers,
  currentUserId,
}: {
  offers: NegotiationOffer[];
  currentUserId?: string;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800', label: 'Accepted', icon: 'checkmark-circle' as const };
      case 'PENDING':
        return { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800', label: 'Pending', icon: 'time' as const };
      case 'REJECTED':
        return { bg: 'bg-rose-50 border-rose-300', text: 'text-rose-800', label: 'Declined', icon: 'close-circle' as const };
      case 'SUPERSEDED':
        return { bg: 'bg-surface-muted border-border', text: 'text-muted', label: 'Superseded', icon: 'arrow-redo-outline' as const };
      case 'EXPIRED':
        return { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-600', label: 'Expired', icon: 'hourglass-outline' as const };
      case 'SUPERSEDED_BY_SALE':
        return { bg: 'bg-purple-50 border-purple-300', text: 'text-purple-800', label: 'Sold to Other', icon: 'alert-circle' as const };
      default:
        return { bg: 'bg-surface-muted border-border', text: 'text-muted', label: status, icon: 'ellipse-outline' as const };
    }
  };

  return (
    <View className="mb-[20px]">
      <Text className="text-ink text-[14px] font-extrabold mb-[12px]">Offer History</Text>
      {offers.map((offer, idx) => {
        const isMine = offer.offered_by_user_id === currentUserId;
        const badge = getStatusBadge(offer.status);
        const unitRate = (parseFloat(offer.offer_amount_bdt) / (parseFloat(offer.offered_quantity) || 1)).toFixed(2);

        return (
          <View key={offer.id} className="flex-row mb-[14px]">
            {/* Timeline connector */}
            <View className="items-center mr-[12px]">
              <View className={`w-7 h-7 rounded-full items-center justify-center border ${badge.bg}`}>
                <Ionicons name={badge.icon} size={14} color={badge.text === 'text-emerald-800' ? '#047857' : badge.text === 'text-amber-800' ? '#b45309' : badge.text === 'text-rose-800' ? '#be123c' : '#6b7280'} />
              </View>
              {idx < offers.length - 1 && <View className="w-[2px] flex-1 bg-border my-[4px]" />}
            </View>

            {/* Offer content */}
            <View className="flex-1 bg-surface border border-border rounded-[14px] p-[12px] shadow-xs">
              <View className="flex-row items-center justify-between mb-[6px]">
                <Text className="text-ink text-[13px] font-bold">
                  {isMine ? 'You offered' : 'Counterparty offered'}
                </Text>
                <View className={`flex-row items-center gap-[4px] px-[8px] py-[2px] rounded-pill border ${badge.bg}`}>
                  <Text className={`text-[10px] font-extrabold ${badge.text}`}>{badge.label}</Text>
                </View>
              </View>

              <Text className="text-ink text-[18px] font-black">
                ৳{offer.offer_amount_bdt}{' '}
                <Text className="text-muted text-[13px] font-semibold">
                  for {offer.offered_quantity} {offer.unit} (৳{unitRate}/{offer.unit})
                </Text>
              </Text>

              {offer.proposed_pickup_at && (
                <View className="flex-row items-center gap-[4px] mt-[4px]">
                  <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                  <Text className="text-muted text-[12px]">
                    Pickup: {new Date(offer.proposed_pickup_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}

              {offer.notes && (
                <Text className="text-ink-soft text-[12px] italic mt-[4px]">"{offer.notes}"</Text>
              )}

              <Text className="text-muted text-[10px] mt-[6px]">
                {new Date(offer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; {new Date(offer.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ActiveOfferCard({
  offer,
  currentUserId,
  threadStatus,
  onAccept,
  onCounter,
  onReject,
  now,
}: {
  offer: NegotiationOffer | null;
  currentUserId?: string;
  threadStatus: string;
  onAccept: () => void;
  onCounter: () => void;
  onReject: () => void;
  now: number;
}) {
  if (!offer) {
    return (
      <View className="bg-surface border border-border rounded-[18px] p-[18px] mb-[16px]">
        <Text className="text-muted text-[14px]">No active offer.</Text>
      </View>
    );
  }

  const isMine = offer.offered_by_user_id === currentUserId;
  const msLeft = new Date(offer.expires_at).getTime() - now;
  const isExpired = msLeft <= 0 || offer.status === 'EXPIRED';
  const isPending = offer.status === 'PENDING' && !isExpired;
  const unitRate = (parseFloat(offer.offer_amount_bdt) / (parseFloat(offer.offered_quantity) || 1)).toFixed(2);

  return (
    <View className="bg-surface border-2 border-leaf rounded-[20px] p-[18px] mb-[16px] shadow-sm">
      <View className="flex-row items-center justify-between mb-[10px]">
        <View className="flex-row items-center gap-[6px]">
          <View className="w-2.5 h-2.5 rounded-full bg-leaf" />
          <Text className="text-leaf-dark text-[12px] font-extrabold tracking-tight">ACTIVE BINDING OFFER</Text>
        </View>

        {isPending && (
          <View className="flex-row items-center gap-[4px] bg-amber-50 border border-amber-300 px-[10px] py-[3px] rounded-pill">
            <Ionicons name="timer-outline" size={13} color="#b45309" />
            <Text className="text-amber-800 text-[11px] font-black">{formatTimeLeft(msLeft)}</Text>
          </View>
        )}
      </View>

      <Text className="text-ink text-[28px] font-black mb-[2px]">৳{offer.offer_amount_bdt}</Text>
      <Text className="text-muted text-[14px] font-bold mb-[12px]">
        {offer.offered_quantity} {offer.unit} &middot; ৳{unitRate}/{offer.unit}
      </Text>

      {offer.proposed_pickup_at && (
        <View className="flex-row items-center gap-[6px] bg-surface-soft p-[10px] rounded-[10px] mb-[10px] border border-border">
          <Ionicons name="calendar" size={16} color={colors.leafDark} />
          <Text className="text-ink text-[12px] font-semibold">
            Proposed Pickup: {new Date(offer.proposed_pickup_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      {offer.notes && (
        <View className="bg-surface-soft p-[10px] rounded-[10px] mb-[14px] border border-border">
          <Text className="text-ink-soft text-[12px]">"{offer.notes}"</Text>
        </View>
      )}

      {/* Action Buttons */}
      {threadStatus === 'OPEN' && isPending ? (
        !isMine ? (
          <View className="flex-row gap-[8px] pt-[6px]">
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-leaf py-[12px] rounded-[12px] items-center justify-center active:opacity-[0.8]"
              onPress={onAccept}
            >
              <Text className="text-white text-[14px] font-extrabold">Accept Offer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-surface-soft border border-leaf py-[12px] rounded-[12px] items-center justify-center active:opacity-[0.8]"
              onPress={onCounter}
            >
              <Text className="text-leaf-dark text-[14px] font-extrabold">Counter-Offer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="px-[14px] py-[12px] rounded-[12px] border border-border items-center justify-center bg-surface active:opacity-[0.8]"
              onPress={onReject}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : (
          <View className="pt-[4px]">
            <View className="flex-row items-center gap-[6px] bg-leaf-soft/50 p-[10px] rounded-[10px] mb-[10px]">
              <Ionicons name="information-circle-outline" size={16} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[12px] font-semibold flex-1">
                Waiting for counterparty to accept, counter, or decline.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              className="bg-surface-soft border border-border py-[10px] rounded-[10px] items-center justify-center active:opacity-[0.8]"
              onPress={onCounter}
            >
              <Text className="text-ink text-[13px] font-bold">Revise / Submit Counter-Offer</Text>
            </Pressable>
          </View>
        )
      ) : threadStatus === 'COMPLETED' ? (
        <View className="bg-emerald-50 border border-emerald-300 p-[12px] rounded-[12px] flex-row items-center gap-[8px]">
          <Ionicons name="checkmark-circle" size={20} color="#047857" />
          <Text className="text-emerald-800 text-[13px] font-extrabold flex-1">
            Negotiation Completed & Binding. Pickup order has been scheduled.
          </Text>
        </View>
      ) : threadStatus === 'SUPERSEDED_BY_SALE' ? (
        <View className="bg-purple-50 border border-purple-300 p-[12px] rounded-[12px] flex-row items-center gap-[8px]">
          <Ionicons name="alert-circle" size={20} color="#6b21a8" />
          <Text className="text-purple-800 text-[13px] font-extrabold flex-1">
            This listing has been sold to another buyer.
          </Text>
        </View>
      ) : isExpired ? (
        <View className="bg-gray-100 border border-gray-300 p-[12px] rounded-[12px] flex-row items-center justify-between">
          <Text className="text-gray-700 text-[13px] font-bold">Offer expired after 24 hours.</Text>
          <Pressable
            className="bg-leaf px-[12px] py-[6px] rounded-[8px]"
            onPress={onCounter}
          >
            <Text className="text-white text-[12px] font-extrabold">Make New Offer</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function CounterOfferInputModal({
  visible,
  onClose,
  onSubmit,
  isPending,
  defaultAmount,
  defaultQuantity,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; quantity: number; notes?: string }) => void;
  isPending: boolean;
  defaultAmount?: string;
  defaultQuantity?: string;
  unit: string;
}) {
  const [amount, setAmount] = useState(defaultAmount || '');
  const [quantity, setQuantity] = useState(defaultQuantity || '');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      if (defaultAmount) setAmount(defaultAmount);
      if (defaultQuantity) setQuantity(defaultQuantity);
      setNotes('');
    }
  }, [visible, defaultAmount, defaultQuantity]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    const numQuantity = parseFloat(quantity);
    if (!numAmount || !numQuantity) return;
    onSubmit({ amount: numAmount, quantity: numQuantity, notes: notes.trim() || undefined });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-[24px] p-[24px] max-h-[85%]">
          <View className="flex-row items-center justify-between mb-[16px]">
            <Text className="text-ink text-[20px] font-extrabold">Submit Counter-Offer</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-muted text-[13px] mb-[16px]">
              Submitting a counter-offer supersedes any previous pending offer and starts a 24-hour binding response window.
            </Text>

            <Text className="text-ink text-[13px] font-bold mb-[6px]">Offer Amount (BDT)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 1500"
              className="bg-surface-soft border border-border rounded-[12px] px-[14px] py-[12px] text-ink font-bold text-[16px] mb-[14px]"
            />

            <Text className="text-ink text-[13px] font-bold mb-[6px]">Quantity ({unit})</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="e.g. 50"
              className="bg-surface-soft border border-border rounded-[12px] px-[14px] py-[12px] text-ink font-bold text-[16px] mb-[14px]"
            />

            <Text className="text-ink text-[13px] font-bold mb-[6px]">Notes / Handover Instructions (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Can pick up tomorrow afternoon"
              multiline
              className="bg-surface-soft border border-border rounded-[12px] px-[14px] py-[12px] text-ink text-[14px] min-h-[80px] mb-[20px]"
            />

            <Pressable
              className="bg-leaf py-[14px] rounded-[12px] items-center justify-center active:opacity-[0.8]"
              disabled={isPending || !amount || !quantity}
              onPress={handleSubmit}
            >
              {isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-[15px] font-extrabold">Send Binding Counter-Offer</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function AcceptOfferConfirmDialog({
  visible,
  onClose,
  onConfirm,
  isPending,
  amount,
  quantity,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  amount: string;
  quantity: string;
  unit: string;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 justify-center items-center bg-black/60 px-[20px]">
        <View className="bg-surface rounded-[24px] p-[24px] w-full max-w-[360px] shadow-lg border border-border">
          <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-[14px] self-center">
            <Ionicons name="lock-closed" size={24} color="#047857" />
          </View>

          <Text className="text-ink text-[20px] font-extrabold text-center mb-[8px]">
            Accept Binding Offer?
          </Text>
          <Text className="text-muted text-[13px] leading-[20px] text-center mb-[16px]">
            Accepting locks this agreement for <Text className="font-extrabold text-ink">৳{amount}</Text> ({quantity} {unit}). The listing will be marked matched, other buyer inquiries dismissed, and a pickup dispatch task scheduled.
          </Text>

          <Pressable
            className="bg-leaf py-[13px] rounded-[12px] items-center justify-center mb-[8px] active:opacity-[0.8]"
            disabled={isPending}
            onPress={onConfirm}
          >
            {isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-[14px] font-extrabold">Confirm & Accept</Text>
            )}
          </Pressable>

          <Pressable
            className="py-[10px] items-center justify-center"
            disabled={isPending}
            onPress={onClose}
          >
            <Text className="text-muted text-[13px] font-bold">Go Back</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function NegotiationThreadScreen({
  threadId,
  onBack,
}: {
  threadId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data: thread, isLoading, refetch, isRefetching } = useNegotiationThread(threadId);

  const submitCounter = useSubmitCounterOffer();
  const acceptOffer = useAcceptOffer();
  const rejectOffer = useRejectOffer();

  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOffer = thread?.offers?.find((o) => o.status === 'PENDING') || thread?.offers?.[thread.offers.length - 1] || null;

  const handleCounterSubmit = async (data: { amount: number; quantity: number; notes?: string }) => {
    await submitCounter.mutateAsync({
      threadId,
      offerAmountBdt: data.amount,
      offeredQuantity: data.quantity,
      notes: data.notes,
    });
    setCounterModalOpen(false);
    void refetch();
  };

  const handleAcceptConfirm = async () => {
    await acceptOffer.mutateAsync({ threadId });
    setAcceptDialogOpen(false);
    void refetch();
  };

  const handleReject = async () => {
    await rejectOffer.mutateAsync({ threadId });
    void refetch();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={colors.leaf} />
        <Text className="text-muted text-[13px] mt-[10px]">Loading negotiation thread...</Text>
      </View>
    );
  }

  if (!thread) {
    return (
      <View className="flex-1 bg-background p-[20px] justify-center items-center">
        <Text className="text-ink text-[16px] font-extrabold mb-[12px]">Thread not found</Text>
        <Pressable className="bg-leaf px-[16px] py-[10px] rounded-[10px]" onPress={onBack}>
          <Text className="text-white text-[13px] font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const peer = thread.buyer_id === user?.id ? thread.seller : thread.buyer;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-[16px] pt-[16px] pb-[12px] border-b border-border bg-surface flex-row items-center gap-[12px]">
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          className="w-10 h-10 items-center justify-center rounded-full active:opacity-[0.7]"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-[6px]">
            <Text className="text-ink text-[16px] font-black" numberOfLines={1}>
              {peer?.full_name || peer?.email || 'Counterparty'}
            </Text>
            <View className="bg-leaf-soft px-[6px] py-[2px] rounded-[4px]">
              <Text className="text-leaf-dark text-[10px] font-bold">{categoryLabel(thread.listing.category)}</Text>
            </View>
          </View>
          <Text className="text-muted text-[12px]">
            Listing Asking: ৳{thread.listing.price_bdt} ({thread.listing.declared_condition})
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        <ActiveOfferCard
          offer={activeOffer}
          currentUserId={user?.id}
          threadStatus={thread.status}
          onAccept={() => setAcceptDialogOpen(true)}
          onCounter={() => setCounterModalOpen(true)}
          onReject={() => void handleReject()}
          now={now}
        />

        <OfferHistoryTimeline offers={thread.offers ?? []} currentUserId={user?.id} />
      </ScrollView>

      <CounterOfferInputModal
        visible={counterModalOpen}
        onClose={() => setCounterModalOpen(false)}
        onSubmit={(data) => void handleCounterSubmit(data)}
        isPending={submitCounter.isPending}
        defaultAmount={activeOffer?.offer_amount_bdt}
        defaultQuantity={activeOffer?.offered_quantity || (thread.listing.unit === 'kg' ? thread.listing.declared_weight || undefined : thread.listing.piece_count ? String(thread.listing.piece_count) : undefined)}
        unit={thread.listing.unit}
      />

      <AcceptOfferConfirmDialog
        visible={acceptDialogOpen}
        onClose={() => setAcceptDialogOpen(false)}
        onConfirm={() => void handleAcceptConfirm()}
        isPending={acceptOffer.isPending}
        amount={activeOffer?.offer_amount_bdt || '0'}
        quantity={activeOffer?.offered_quantity || '0'}
        unit={activeOffer?.unit || thread.listing.unit}
      />
    </View>
  );
}
