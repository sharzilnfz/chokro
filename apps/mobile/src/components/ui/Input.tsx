// Labeled text input used across forms.
// Third-party and app modules used to render the input.
import React, { type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme';

// Standard TextInput props plus a required label and optional right accessory.
type InputProps = TextInputProps & {
  label: string;
  rightAccessory?: ReactNode;
};

// Renders the label above the styled text field.
export function Input({ label, rightAccessory, className = '', ...props }: InputProps) {
  if (rightAccessory) {
    return (
      <>
        <Text className="text-ink text-[14px] font-bold mb-[7px]">{label}</Text>
        <View className="min-h-[52px] border border-border rounded-sm bg-background flex-row items-center px-[14px] mb-[14px]">
          <TextInput
            className={`flex-1 text-ink text-[16px] py-[12px] pr-[8px] ${className}`}
            placeholderTextColor={colors.muted}
            {...props}
          />
          {rightAccessory}
        </View>
      </>
    );
  }

  return (
    <>
      <Text className="text-ink text-[14px] font-bold mb-[7px]">{label}</Text>
      <TextInput
        className={`min-h-[52px] border border-border rounded-sm bg-background text-ink text-[16px] px-[14px] mb-[14px] ${className}`}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </>
  );
}
