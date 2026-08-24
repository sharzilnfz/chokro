import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RateCardEstimator } from '@/components/ratecard/RateCardEstimator';
import { RateCardBrowser } from '@/components/ratecard/RateCardBrowser';

type RateMode = 'estimate' | 'browse';

const MODES: { key: RateMode; label: string }[] = [
  { key: 'estimate', label: 'Estimate' },
  { key: 'browse', label: 'Browse rates' },
];

export function RateCardScreen() {
  const [mode, setMode] = useState<RateMode>('estimate');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="mb-[18px]">
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          MARKET-BENCHMARKED RATES
        </Text>
        <Text
          accessibilityRole="header"
          className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"
        >
          {mode === 'estimate' ? "What's it worth?" : 'Official rate card'}
        </Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px]">
          {mode === 'estimate'
            ? 'Pick a category and condition, enter your quantity, and see the live value benchmarked against commodity indices.'
            : 'Published rates in BDT per category and condition band, updated continuously with global market sync.'}
        </Text>
      </View>

      {/* Mode Switcher */}
      <View
        className="flex-row bg-surface-muted border border-border rounded-pill p-[4px] mb-[20px]"
        accessibilityRole="tablist"
        accessibilityLabel="Rate Card Mode"
      >
        {MODES.map(({ key, label }) => {
          const selected = mode === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              className={`flex-1 min-h-[44px] rounded-pill items-center justify-center ${
                selected ? 'bg-surface shadow-card' : ''
              }`}
              onPress={() => setMode(key)}
            >
              <Text className={`text-[13px] font-bold ${selected ? 'text-ink' : 'text-muted'}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Explicit Variant View */}
      {mode === 'estimate' ? <RateCardEstimator /> : <RateCardBrowser />}
    </ScrollView>
  );
}
