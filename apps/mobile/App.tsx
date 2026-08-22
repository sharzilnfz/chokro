import "./global.css";
import React, { useEffect } from 'react';
import { AppState, Platform, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { AppShell } from '@/navigation/AppShell';
import { colors } from '@/theme';

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'An unknown runtime error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    // Keep stack traces in the console for debugging while the UI shows a readable fallback.
    console.error('[RootErrorBoundary] App crashed before render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-background">
          <ScrollView contentContainerClassName="flex-grow items-center justify-center p-6">
            <View className="w-full max-w-[480px] rounded-2xl bg-surface border border-border p-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="warning-outline" size={22} color={colors.danger} />
                <Text className="text-ink text-lg font-extrabold">App failed to render</Text>
              </View>
              <Text className="text-muted text-[14px] leading-[21px]">
                This is a runtime error, not camera permission behavior.
              </Text>
              <Text className="text-danger text-[13px] leading-[19px] mt-3">
                {this.state.message}
              </Text>
              <Text className="text-muted text-[12px] leading-[18px] mt-3">
                Open browser DevTools Console for the first red error stack, then share it.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RootErrorBoundary>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </RootErrorBoundary>
    </QueryClientProvider>
  );
}
