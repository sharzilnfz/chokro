import "./global.css";
import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AppShell } from '@/navigation/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

