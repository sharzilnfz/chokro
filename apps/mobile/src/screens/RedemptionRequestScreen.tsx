// RedemptionRequestScreen (M14): Verified Green Credit Cash-out & MFS Payout Request (SPEC 13 / Ticket 09a)
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { useWallet } from '@/hooks/useWallet';
import {
  type PayoutChannel,
  type RedemptionStatus,
} from '@chokro/shared';

interface RedemptionRequestScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const CHANNELS: Array<{ id: PayoutChannel; label: string; icon: string; color: string; bgColor: string }> = [
  { id: 'BKASH', label: 'bKash', icon: 'phone-portrait-outline', color: '#D12053', bgColor: '#FDF2F4' },
  { id: 'NAGAD', label: 'Nagad', icon: 'flash-outline', color: '#E83E1E', bgColor: '#FEF3F0' },
  { id: 'ROCKET', label: 'Rocket', icon: 'rocket-outline', color: '#8C3494', bgColor: '#FAF3FB' },
  { id: 'UPAY', label: 'Upay', icon: 'wallet-outline', color: '#0F70B7', bgColor: '#F0F7FC' },
];

const FEE_PERCENTAGE = 1.85; // Standard MFS Cash-out fee percentage
const MIN_REDEMPTION = 50.0;
const MONTHLY_USER_CAP = 5000.0;

export function RedemptionRequestScreen({ onBack, onSuccess }: RedemptionRequestScreenProps) {
  const { data: walletData, refetch: refetchWallet } = useWallet();
  const verifiedBalance = walletData?.balance.verified ?? 0;

  const [channel, setChannel] = useState<PayoutChannel>('BKASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    status: RedemptionStatus;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    accountNumber: string;
    channel: string;
    gatewayRef?: string | null;
    isSimulated?: boolean;
    failingSignals?: string[];
  } | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = Number(((numAmount * FEE_PERCENTAGE) / 100).toFixed(2));
  const netAmount = Math.max(0, Number((numAmount - feeAmount).toFixed(2)));

  const isValidPhone = useMemo(() => {
    return /^01[3-9]\d{8}$/.test(accountNumber.trim());
  }, [accountNumber]);

  const isValidAmount = numAmount >= MIN_REDEMPTION && numAmount <= verifiedBalance;

  const handleSetAmount = (preset: 'min' | 'half' | 'max') => {
    if (preset === 'min') {
      setAmount(String(MIN_REDEMPTION));
    } else if (preset === 'half') {
      setAmount(String(Math.floor(verifiedBalance / 2)));
    } else if (preset === 'max') {
      setAmount(String(Math.floor(verifiedBalance)));
    }
  };

  const handleSubmit = useCallback(async () => {
    setError('');

    if (!isValidPhone) {
      setError('Please enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX).');
      return;
    }

    if (numAmount < MIN_REDEMPTION) {
      setError(`Minimum cash-out is ৳${MIN_REDEMPTION.toFixed(2)}.`);
      return;
    }

    if (numAmount > verifiedBalance) {
      setError(`Requested amount (৳${numAmount.toFixed(2)}) exceeds verified balance (৳${verifiedBalance.toFixed(2)}).`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiRequest<{
        message: string;
        redemption: any;
        payout?: any;
        decision: string;
        isSimulated?: boolean;
        failingSignals?: string[];
      }>('/api/wallet/redemptions', {
        method: 'POST',
        body: JSON.stringify({
          amountCredits: numAmount,
          payoutChannel: channel,
          accountNumber: accountNumber.trim(),
        }),
      });

      await refetchWallet();

      setResult({
        status: response.redemption.status,
        grossAmount: Number(response.redemption.gross_amount_bdt),
        feeAmount: Number(response.redemption.fee_bdt),
        netAmount: Number(response.redemption.net_amount_bdt),
        accountNumber: response.redemption.account_number,
        channel: response.redemption.payout_channel,
        gatewayRef: response.payout?.gateway_ref || null,
        isSimulated: response.isSimulated,
        failingSignals: response.failingSignals,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit cash-out request.'));
    } finally {
      setSubmitting(false);
    }
  }, [accountNumber, channel, isValidPhone, numAmount, onSuccess, refetchWallet, verifiedBalance]);

  // Success / Outcome View
  if (result) {
    const isPaid = result.status === 'PAID';
    const isEscalated = result.status === 'ESCALATED';

    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 items-center justify-center min-h-full">
        <View
          className={`w-18 h-18 rounded-full items-center justify-center mb-4 ${
            isPaid ? 'bg-leaf-soft' : isEscalated ? 'bg-amber-soft' : 'bg-surface-muted'
          }`}
        >
          <Ionicons
            name={isPaid ? 'checkmark-circle' : isEscalated ? 'time-outline' : 'information-circle-outline'}
            size={48}
            color={isPaid ? colors.leaf : isEscalated ? colors.amber : colors.muted}
          />
        </View>

        <Text className="text-ink text-2xl font-black text-center mb-1">
          {isPaid ? 'Cash-Out Completed!' : isEscalated ? 'Request Under Review' : 'Redemption Processed'}
        </Text>

        <Text className="text-muted text-sm text-center mb-6 px-4">
          {isPaid
            ? `৳${result.netAmount.toFixed(2)} has been transferred to your ${result.channel} account (${result.accountNumber}).`
            : isEscalated
              ? 'Your request requires routine Trust Gate verification. You will be notified once reviewed by administrators.'
              : `Your redemption request has been recorded with status ${result.status}.`}
        </Text>

        {/* Breakdown Card */}
        <View className="bg-surface border border-border rounded-2xl p-5 w-full mb-6 shadow-card">
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-muted text-xs font-semibold">Gross Credits</Text>
            <Text className="text-ink text-xs font-black">৳{result.grossAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-muted text-xs font-semibold">MFS Transfer Fee ({FEE_PERCENTAGE}%)</Text>
            <Text className="text-danger text-xs font-black">- ৳{result.feeAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-ink text-sm font-extrabold">Net Disbursed</Text>
            <Text className="text-leaf-dark text-lg font-black">৳{result.netAmount.toFixed(2)}</Text>
          </View>
          {result.gatewayRef && (
            <View className="mt-2 pt-2 border-t border-border flex-row justify-between items-center">
              <Text className="text-muted text-[11px]">Transaction Ref</Text>
              <Text className="text-slate-700 text-[11px] font-mono font-bold">{result.gatewayRef}</Text>
            </View>
          )}
          {result.isSimulated && (
            <View className="mt-2 p-2 rounded-lg bg-leaf-soft border border-leaf/30 items-center">
              <Text className="text-leaf-dark text-[10px] font-bold">
                ✓ Offline Sandbox Mode · Simulated Settlement Recorded
              </Text>
            </View>
          )}
        </View>

        <Pressable
          className="min-h-[50px] w-full rounded-2xl bg-leaf items-center justify-center active:opacity-75"
          onPress={onBack}
        >
          <Text className="text-surface text-base font-extrabold">Back to Green Wallet</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-5 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="w-10 h-10 rounded-xl bg-surface border border-border items-center justify-center active:opacity-70"
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-leaf text-xs font-extrabold tracking-wider">MFS CASH-OUT (M14)</Text>
        <View className="w-10" />
      </View>

      <Text accessibilityRole="header" className="text-3xl font-black text-ink tracking-tight mt-2">
        Redeem Credits
      </Text>
      <Text className="text-sm text-muted leading-5 mt-1 mb-5">
        Convert your verified Green Credits to Mobile Financial Services (MFS) cash. Real-world transfer fee is disclosed transparently.
      </Text>

      {/* Verified Balance Banner */}
      <View className="bg-leaf-dark rounded-3xl p-5 mb-5 shadow-card">
        <Text className="text-[#BBD5C5] text-[11px] font-extrabold tracking-wider">SPENDABLE VERIFIED BALANCE</Text>
        <View className="flex-row items-baseline gap-2 mt-1">
          <Text className="text-surface text-4xl font-black">৳{verifiedBalance.toFixed(2)}</Text>
          <Text className="text-[#DCEADF] text-xs font-semibold">Green Credits</Text>
        </View>
        <Text className="text-[#BBD5C5] text-[11px] mt-2">
          Monthly cap remaining: ৳{Math.max(0, MONTHLY_USER_CAP - 0).toFixed(2)} · Min: ৳{MIN_REDEMPTION.toFixed(2)}
        </Text>
      </View>

      {/* 1. MFS Channel Selector */}
      <Text className="text-ink text-sm font-extrabold mb-2.5">1. Select Payout Channel</Text>
      <View className="flex-row flex-wrap gap-2.5 mb-5">
        {CHANNELS.map((item) => {
          const selected = channel === item.id;
          return (
            <Pressable
              key={item.id}
              className={`flex-1 min-w-[45%] p-3.5 rounded-2xl border flex-row items-center gap-3 active:opacity-75 ${
                selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
              }`}
              onPress={() => setChannel(item.id)}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: item.bgColor }}
              >
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View>
                <Text className={`text-sm font-extrabold ${selected ? 'text-leaf-dark' : 'text-ink'}`}>
                  {item.label}
                </Text>
                <Text className="text-[10px] text-muted">Personal / Agent</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 2. Account Number Input */}
      <Text className="text-ink text-sm font-extrabold mb-2">2. Account Mobile Number</Text>
      <View className="mb-5">
        <View className="flex-row items-center border border-border rounded-2xl bg-surface px-4 min-h-[52px]">
          <Ionicons name="call-outline" size={18} color={colors.muted} className="mr-2.5" />
          <TextInput
            className="flex-1 text-ink text-base font-bold"
            placeholder="01XXXXXXXXX"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            maxLength={11}
            value={accountNumber}
            onChangeText={setAccountNumber}
          />
          {accountNumber.length > 0 && (
            <Ionicons
              name={isValidPhone ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={isValidPhone ? colors.leaf : colors.danger}
            />
          )}
        </View>
        <Text className="text-[11px] text-muted mt-1 px-1">
          Must be an active 11-digit Bangladeshi mobile wallet account.
        </Text>
      </View>

      {/* 3. Amount & Quick Presets */}
      <Text className="text-ink text-sm font-extrabold mb-2">3. Redemption Amount (Credits)</Text>
      <View className="mb-5">
        <View className="flex-row items-center border border-border rounded-2xl bg-surface px-4 min-h-[52px] mb-2.5">
          <Text className="text-ink text-lg font-black mr-2">৳</Text>
          <TextInput
            className="flex-1 text-ink text-xl font-black"
            placeholder="50.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Presets */}
        <View className="flex-row gap-2">
          <Pressable
            className="flex-1 py-2 rounded-xl bg-surface border border-border items-center active:opacity-70"
            onPress={() => handleSetAmount('min')}
          >
            <Text className="text-xs font-bold text-ink">Min (৳50)</Text>
          </Pressable>
          <Pressable
            className="flex-1 py-2 rounded-xl bg-surface border border-border items-center active:opacity-70"
            onPress={() => handleSetAmount('half')}
          >
            <Text className="text-xs font-bold text-ink">50% (৳{Math.floor(verifiedBalance / 2)})</Text>
          </Pressable>
          <Pressable
            className="flex-1 py-2 rounded-xl bg-surface border border-border items-center active:opacity-70"
            onPress={() => handleSetAmount('max')}
          >
            <Text className="text-xs font-bold text-leaf-dark">Max (৳{Math.floor(verifiedBalance)})</Text>
          </Pressable>
        </View>
      </View>

      {/* Transparent Fee Disclosure Card */}
      {numAmount > 0 && (
        <View className="bg-surface border border-border rounded-2xl p-4 mb-5 shadow-card">
          <Text className="text-xs font-extrabold text-leaf-dark tracking-wider mb-2.5">
            HONEST FEE DISCLOSURE
          </Text>
          <View className="flex-row justify-between py-1.5 border-b border-border">
            <Text className="text-xs text-muted">Requested Amount</Text>
            <Text className="text-xs font-bold text-ink">৳{numAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between py-1.5 border-b border-border">
            <Text className="text-xs text-muted">Transfer Fee ({FEE_PERCENTAGE}%)</Text>
            <Text className="text-xs font-bold text-danger">- ৳{feeAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between pt-2">
            <Text className="text-sm font-extrabold text-ink">You will receive</Text>
            <Text className="text-base font-black text-leaf-dark">৳{netAmount.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {error ? (
        <View className="bg-danger-soft border border-danger/40 p-3.5 rounded-xl mb-4">
          <Text accessibilityRole="alert" className="text-danger text-xs font-bold">
            {error}
          </Text>
        </View>
      ) : null}

      {/* Submit Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit cash-out redemption"
        accessibilityState={{ disabled: submitting || !isValidPhone || !isValidAmount }}
        className={`min-h-[52px] rounded-2xl bg-leaf items-center justify-center active:opacity-75 ${
          submitting || !isValidPhone || !isValidAmount ? 'opacity-50' : ''
        }`}
        disabled={submitting || !isValidPhone || !isValidAmount}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text className="text-surface text-base font-extrabold">
            Cash Out ৳{netAmount > 0 ? netAmount.toFixed(2) : '0.00'} via {channel}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
