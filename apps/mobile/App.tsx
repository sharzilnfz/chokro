import "./global.css";
import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { AppShell } from './src/components/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

