import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';

export type StateViewProps = {
  isLoading?: boolean;
  loadingTitle?: string;
  loadingSubtitle?: string;
  error?: unknown | string | null;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyAction?: React.ReactNode;
  children?: React.ReactNode;
  containerClassName?: string;
  fullScreen?: boolean;
};

export function StateView({
  isLoading = false,
  loadingTitle = 'Loading...',
  loadingSubtitle,
  error = null,
  errorTitle = 'Something went wrong',
  errorMessage,
  onRetry,
  retryLabel = 'Try again',
  isEmpty = false,
  emptyTitle,
  emptyMessage,
  emptyIcon = 'leaf-outline',
  emptyAction,
  children,
  containerClassName,
  fullScreen = false,
}: StateViewProps) {
  const hasError = Boolean(error || errorMessage);
  const resolvedErrorMessage = errorMessage
    ? errorMessage
    : typeof error === 'string'
      ? error
      : error
        ? getErrorMessage(error, 'Something went wrong')
        : '';

  const baseContainerClass = fullScreen
    ? 'flex-1 items-center justify-center bg-background p-[28px]'
    : 'items-center justify-center p-[22px]';

  const containerClass = containerClassName
    ? `${baseContainerClass} ${containerClassName}`
    : baseContainerClass;

  if (isLoading) {
    return (
      <View className={containerClass} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        {loadingTitle ? (
          <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">
            {loadingTitle}
          </Text>
        ) : null}
        {loadingSubtitle ? (
          <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">
            {loadingSubtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  if (hasError) {
    return (
      <View className={containerClass} accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">
          {errorTitle}
        </Text>
        {resolvedErrorMessage ? (
          <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">
            {resolvedErrorMessage}
          </Text>
        ) : null}
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
            className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"
            onPress={onRetry}
          >
            <Text className="text-surface text-[14px] font-extrabold">{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className={containerClass}>
        <Ionicons name={emptyIcon} size={32} color={colors.leaf} />
        {emptyTitle ? (
          <Text className="text-ink text-[16px] font-extrabold text-center mt-[9px]">
            {emptyTitle}
          </Text>
        ) : null}
        {emptyMessage ? (
          <Text className="text-muted text-[13px] leading-[19px] text-center mt-[5px]">
            {emptyMessage}
          </Text>
        ) : null}
        {emptyAction ? <View className="mt-[14px]">{emptyAction}</View> : null}
      </View>
    );
  }

  return <>{children ?? null}</>;
}
