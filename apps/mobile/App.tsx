import "./global.css";
import React, { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { AppShell } from '@/navigation/AppShell';

export default function App() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    return () => subscription.remove();
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        className="flex-1 w-full min-h-screen bg-slate-950 items-center justify-center"
        style={{ height: '100%', overflow: 'hidden' }}
      >
        <View
          className="w-full max-w-[430px] h-screen bg-background overflow-hidden flex flex-col shadow-2xl"
          style={{ height: '100%', flexDirection: 'column' }}
        >
          {content}
        </View>
      </View>
    );
  }

  return content;
}

