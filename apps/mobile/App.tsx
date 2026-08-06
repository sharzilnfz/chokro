import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FeedScreen } from './src/screens/FeedScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'create' | 'wallet' | 'scan' | 'auth'>('feed');
  const [authToken, setAuthToken] = useState<string>('demo-jwt-token');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.appTitle}>Chokro</Text>
        </View>
        <TouchableOpacity style={styles.authBadge} onPress={() => setActiveTab('auth')}>
          <Text style={styles.authBadgeText}>{authToken ? 'Logged In' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {activeTab === 'feed' && <FeedScreen />}
        {activeTab === 'create' && (
          <CreateListingScreen token={authToken} onCreated={() => setActiveTab('feed')} />
        )}
        {activeTab === 'wallet' && <WalletScreen token={authToken} />}
        {activeTab === 'scan' && (
          <QRScannerScreen token={authToken} onDepositSuccess={() => setActiveTab('wallet')} />
        )}
        {activeTab === 'auth' && (
          <LoginScreen
            onLoginSuccess={(token) => {
              setAuthToken(token);
              setActiveTab('feed');
            }}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('feed')}>
          <Text style={[styles.navIcon, activeTab === 'feed' && styles.navIconActive]}>🌐</Text>
          <Text style={[styles.navLabel, activeTab === 'feed' && styles.navLabelActive]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('create')}>
          <Text style={[styles.navIcon, activeTab === 'create' && styles.navIconActive]}>➕</Text>
          <Text style={[styles.navLabel, activeTab === 'create' && styles.navLabelActive]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('wallet')}>
          <Text style={[styles.navIcon, activeTab === 'wallet' && styles.navIconActive]}>💳</Text>
          <Text style={[styles.navLabel, activeTab === 'wallet' && styles.navLabelActive]}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('scan')}>
          <Text style={[styles.navIcon, activeTab === 'scan' && styles.navIconActive]}>📷</Text>
          <Text style={[styles.navLabel, activeTab === 'scan' && styles.navLabelActive]}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#090D16',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#090D16', fontWeight: 'bold', fontSize: 18 },
  appTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold' },
  authBadge: { backgroundColor: '#131C2E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  authBadgeText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  body: { flex: 1 },
  navBar: {
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#131C2E',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: { alignItems: 'center' },
  navIcon: { fontSize: 20, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: { color: '#94A3B8', fontSize: 11, marginTop: 2, fontWeight: '600' },
  navLabelActive: { color: '#10B981' },
});
