// HandoverOtpModal (M08): Two-sided 6-digit Custody Handover Challenge & Verification Modal (SPEC 12 / Ticket 08b)
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { getErrorMessage } from '@/services/api';
import { useGenerateHandoverOtp, useVerifyHandoverOtp } from '@/hooks/useHandovers';

export interface HandoverOtpModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  mode: 'GIVER' | 'COLLECTOR';
  listingCategory?: string;
  declaredQuantity?: string | number | null;
  unit?: string;
  onSuccess?: () => void;
}

export const HandoverOtpModal = React.memo(function HandoverOtpModal({
  visible,
  onClose,
  taskId,
  mode,
  listingCategory,
  declaredQuantity,
  unit = 'kg',
  onSuccess,
}: HandoverOtpModalProps) {
  const generateOtpMutation = useGenerateHandoverOtp();
  const verifyOtpMutation = useVerifyHandoverOtp();

  // Giver state
  const [giverOtp, setGiverOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Collector state
  const [collectorCode, setCollectorCode] = useState<string>('');
  const [verifiedQty, setVerifiedQty] = useState<string>('');
  const [collectorNotes, setCollectorNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // On open as giver, generate or fetch code
  useEffect(() => {
    if (visible && mode === 'GIVER' && taskId) {
      setErrorMsg(null);
      setSuccessMsg(null);
      generateOtpMutation.mutate(
        { taskId },
        {
          onSuccess: (data) => {
            if (data.otpCode) {
              setGiverOtp(data.otpCode);
            }
            if (data.handover?.expires_at) {
              setExpiresAt(data.handover.expires_at);
            }
          },
          onError: (err) => {
            setErrorMsg(getErrorMessage(err, 'Failed to generate handover code.'));
          },
        }
      );
    } else if (visible && mode === 'COLLECTOR') {
      setCollectorCode('');
      setVerifiedQty(declaredQuantity ? String(declaredQuantity) : '');
      setCollectorNotes('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [visible, mode, taskId]);

  async function handleVerify() {
    if (collectorCode.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit challenge code.');
      return;
    }

    setErrorMsg(null);
    try {
      await verifyOtpMutation.mutateAsync({
        taskId,
        otpCode: collectorCode.trim(),
        verifiedQuantity: verifiedQty ? parseFloat(verifiedQty) : undefined,
        notes: collectorNotes.trim() || undefined,
      });

      setSuccessMsg('Custody handover verified successfully! Pickup is now collected.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to verify OTP challenge code.'));
    }
  }

  function handleRegenerate() {
    setErrorMsg(null);
    generateOtpMutation.mutate(
      { taskId },
      {
        onSuccess: (data) => {
          if (data.otpCode) {
            setGiverOtp(data.otpCode);
          }
          if (data.handover?.expires_at) {
            setExpiresAt(data.handover.expires_at);
          }
        },
        onError: (err) => {
          setErrorMsg(getErrorMessage(err, 'Failed to regenerate handover code.'));
        },
      }
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-ink/60 justify-end">
        <View
          className="bg-surface rounded-t-[24px] max-h-[85%] p-[20px] pb-[36px]"
          style={{ elevation: 8 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-[12px] border-b border-border">
            <View>
              <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
                CUSTODY HANDOVER (M08)
              </Text>
              <Text className="text-ink text-[19px] font-extrabold tracking-tight mt-[2px]">
                {mode === 'GIVER' ? 'Your Handover Code' : 'Verify Pickup Handover'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              className="w-[40px] h-[40px] rounded-pill bg-surface-muted items-center justify-center active:opacity-[0.72]"
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView className="mt-[14px]" showsVerticalScrollIndicator={false}>
            {/* Context chip */}
            {listingCategory && (
              <View className="flex-row items-center gap-[6px] bg-surface-muted px-[12px] py-[6px] rounded-pill self-start mb-[14px]">
                <Ionicons name="cube-outline" size={14} color={colors.leafDark} />
                <Text className="text-leaf-dark text-[12px] font-bold">
                  {listingCategory} {declaredQuantity ? `· ${declaredQuantity} ${unit}` : ''}
                </Text>
              </View>
            )}

            {/* Error / Success alert */}
            {errorMsg && (
              <View className="p-[12px] bg-danger-soft border border-danger/30 rounded-[10px] mb-[14px]">
                <Text className="text-danger text-[13px] font-bold">{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View className="p-[12px] bg-leaf-soft border border-leaf/30 rounded-[10px] mb-[14px]">
                <Text className="text-leaf-dark text-[13px] font-bold">{successMsg}</Text>
              </View>
            )}

            {/* GIVER MODE */}
            {mode === 'GIVER' && (
              <View className="items-center py-[10px]">
                {generateOtpMutation.isPending ? (
                  <View className="py-[30px] items-center">
                    <ActivityIndicator size="large" color={colors.leaf} />
                    <Text className="text-muted text-[13px] font-bold mt-[10px]">
                      Generating secure 6-digit challenge code…
                    </Text>
                  </View>
                ) : giverOtp ? (
                  <>
                    <Text className="text-muted text-[13px] text-center mb-[14px]">
                      Show this 6-digit challenge code to the collector when they arrive at your door.
                    </Text>

                    {/* 6-digit Display */}
                    <View className="flex-row gap-[8px] justify-center my-[10px]">
                      {giverOtp.split('').map((digit, idx) => (
                        <View
                          key={idx}
                          className="w-[44px] h-[54px] bg-leaf-soft border-2 border-leaf rounded-[12px] items-center justify-center shadow-sm"
                        >
                          <Text className="text-leaf-dark text-[24px] font-extrabold">
                            {digit}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {expiresAt && (
                      <Text className="text-muted text-[12px] mt-[10px]">
                        Expires in 15 minutes
                      </Text>
                    )}

                    <View className="mt-[20px] w-full">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Regenerate code"
                        className="py-[12px] rounded-[10px] bg-surface-muted border border-border items-center justify-center active:opacity-[0.72]"
                        onPress={handleRegenerate}
                      >
                        <Text className="text-ink text-[13px] font-bold">
                          Regenerate Code
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View className="py-[20px] items-center">
                    <Text className="text-muted text-[13px] text-center mb-[14px]">
                      A 15-minute challenge code is required to complete this physical handover.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      className="px-[20px] py-[12px] rounded-[10px] bg-leaf items-center justify-center active:opacity-[0.72]"
                      onPress={handleRegenerate}
                    >
                      <Text className="text-surface text-[14px] font-extrabold">
                        Generate Handover Code
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* COLLECTOR MODE */}
            {mode === 'COLLECTOR' && (
              <View className="py-[10px]">
                <Text className="text-muted text-[13px] mb-[12px]">
                  Ask the giver for the 6-digit challenge code displayed in their app to verify custody.
                </Text>

                {/* OTP Input */}
                <Text className="text-ink text-[12px] font-bold mb-[4px]">
                  6-Digit Handover Code *
                </Text>
                <TextInput
                  accessibilityLabel="6-digit handover code input"
                  className="bg-surface-muted border border-border rounded-[10px] p-[12px] text-[20px] font-extrabold tracking-[4px] text-center text-ink mb-[14px]"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                  value={collectorCode}
                  onChangeText={setCollectorCode}
                />

                {/* Verified Quantity Adjustment */}
                <Text className="text-ink text-[12px] font-bold mb-[4px]">
                  Verified Scale Quantity ({unit})
                </Text>
                <TextInput
                  accessibilityLabel="Verified quantity input"
                  className="bg-surface-muted border border-border rounded-[10px] p-[10px] text-[14px] text-ink mb-[14px]"
                  keyboardType="decimal-pad"
                  placeholder={`Declared: ${declaredQuantity || 0} ${unit}`}
                  placeholderTextColor={colors.muted}
                  value={verifiedQty}
                  onChangeText={setVerifiedQty}
                />

                {/* Notes */}
                <Text className="text-ink text-[12px] font-bold mb-[4px]">
                  Handover Notes (optional)
                </Text>
                <TextInput
                  accessibilityLabel="Handover notes input"
                  className="bg-surface-muted border border-border rounded-[10px] p-[10px] text-[13px] text-ink mb-[18px]"
                  placeholder="Condition verified, clean packaging, etc."
                  placeholderTextColor={colors.muted}
                  value={collectorNotes}
                  onChangeText={setCollectorNotes}
                />

                {/* Submit Action */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Verify handover and mark collected"
                  accessibilityState={{ disabled: verifyOtpMutation.isPending }}
                  disabled={verifyOtpMutation.isPending}
                  className="min-h-[48px] rounded-[10px] items-center justify-center bg-leaf flex-row gap-[8px] active:opacity-[0.72]"
                  onPress={handleVerify}
                >
                  {verifyOtpMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.surface} />
                      <Text className="text-surface text-[14px] font-extrabold">
                        Verify & Complete Custody
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});
