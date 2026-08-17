import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

export const SCHEDULE_PRESETS = [
  { key: 'today-evening', label: 'Today 4–6pm', dayOffset: 0, hour: 16 },
  { key: 'tomorrow-morning', label: 'Tomorrow 9–11am', dayOffset: 1, hour: 9 },
  { key: 'tomorrow-afternoon', label: 'Tomorrow 2–4pm', dayOffset: 1, hour: 14 },
] as const;

export type SchedulePreset = (typeof SCHEDULE_PRESETS)[number]['key'];

export function presetToDate(key: SchedulePreset): Date {
  const preset = SCHEDULE_PRESETS.find((item) => item.key === key) ?? SCHEDULE_PRESETS[0];
  const date = new Date();
  date.setDate(date.getDate() + preset.dayOffset);
  date.setHours(preset.hour, 0, 0, 0);
  return date;
}

export interface SchedulePickerProps {
  selectedKey: SchedulePreset;
  onSelectKey: (key: SchedulePreset) => void;
}

export const SchedulePicker = React.memo(function SchedulePicker({
  selectedKey,
  onSelectKey,
}: SchedulePickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
    >
      {SCHEDULE_PRESETS.map((preset) => {
        const selected = selectedKey === preset.key;
        return (
          <Pressable
            key={preset.key}
            accessibilityRole="radio"
            accessibilityLabel={preset.label}
            accessibilityState={{ checked: selected }}
            className={`min-h-[44px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
              selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
            }`}
            onPress={() => onSelectKey(preset.key)}
          >
            <Text
              className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}
            >
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
