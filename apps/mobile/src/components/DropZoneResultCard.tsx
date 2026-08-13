import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';

export interface DropZone {
  id: string;
  name: string;
  status: string;
  acceptedCategories?: string[];
  institutionId?: string;
}

export interface DropZoneResultCardProps {
  zone: DropZone;
  acceptedCategories: string[];
  onScanAgain: () => void;
}

export function DropZoneResultCard({
  zone,
  acceptedCategories,
  onScanAgain,
}: DropZoneResultCardProps) {
  return (
    <View accessibilityRole="summary" className="bg-surface border border-leaf rounded-lg p-[19px] mt-[13px] shadow-card" style={{ elevation: 2 }}>
      <View className="w-[48px] h-[48px] rounded-[16px] bg-leaf items-center justify-center mb-[14px]">
        <Ionicons name="location" size={25} color={colors.surface} />
      </View>
      <Text className="text-leaf text-[10px] font-black tracking-[1.2px]">REGISTERED DROP ZONE</Text>
      <Text className="text-ink text-[23px] leading-[29px] font-extrabold mt-[4px]">{zone.name}</Text>
      <View className="self-start min-h-[32px] flex-row items-center gap-[6px] bg-leaf-soft rounded-pill px-[11px] mt-[10px]">
        <View className="w-[7px] h-[7px] rounded-[4px] bg-leaf" />
        <Text className="text-leaf-dark text-[11px] font-extrabold">{categoryLabel(zone.status)}</Text>
      </View>
      <Text className="text-ink text-[13px] font-extrabold mt-[18px] mb-[8px]">Accepted categories</Text>
      <View className="flex-row flex-wrap gap-[7px]">
        {acceptedCategories.length > 0 ? acceptedCategories.map((category) => (
          <View key={category} className="min-h-[36px] rounded-pill bg-surface-muted items-center justify-center px-[11px]">
            <Text className="text-ink text-[11px] font-bold">{categoryLabel(category)}</Text>
          </View>
        )) : <Text className="text-muted text-[12px] leading-[18px]">No accepted categories were returned by the API.</Text>}
      </View>
      <View className="flex-row items-start gap-[8px] bg-amber-soft rounded-[12px] p-[12px] mt-[16px]">
        <Ionicons name="information-circle-outline" size={21} color={colors.amber} />
        <Text className="flex-1 text-amber text-[12px] leading-[18px] font-bold">Zone recognized only. No deposit was recorded and no credit was created.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan another Drop Zone"
        className="min-h-[50px] flex-row items-center justify-center gap-[8px] border border-leaf rounded-[14px] mt-[13px] active:opacity-[0.72]"
        onPress={onScanAgain}
      >
        <Ionicons name="scan-outline" size={20} color={colors.leafDark} />
        <Text className="text-leaf-dark text-[14px] font-extrabold">Scan another zone</Text>
      </Pressable>
    </View>
  );
}
