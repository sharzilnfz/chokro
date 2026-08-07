import React from 'react';
import { Text, TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/theme';

type InputProps = TextInputProps & {
  label: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <>
      <Text className="text-ink text-[14px] font-bold mb-[7px]">{label}</Text>
      <TextInput
        className="min-h-[52px] border border-border rounded-sm bg-background text-ink text-[16px] px-[14px] mb-[14px]"
        placeholderTextColor={colors.muted}
        {...props}
      />
    </>
  );
}
