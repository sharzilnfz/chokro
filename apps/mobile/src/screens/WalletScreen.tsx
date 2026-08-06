import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';

export function WalletScreen({ token }: { token: string }) {
  const [balance, setBalance] = useState({ verified: 0, pending: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const [balRes, txnsRes] = await Promise.all([
        fetch('http://localhost:3000/api/wallet/balance', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/wallet/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const balData = await balRes.json();
      const txnsData = await txnsRes.json();

      if (balData.balance) setBalance(balData.balance);
      if (txnsData.transactions) setTransactions(txnsData.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Green Credit Wallet</Text>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Verified Balance</Text>
          <Text style={styles.verifiedAmount}>৳{balance.verified.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pending Credits</Text>
          <Text style={styles.pendingAmount}>৳{balance.pending.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Ledger History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View>
              <Text style={styles.txKind}>{item.kind} — {item.status}</Text>
              {item.reason && <Text style={styles.txReason}>{item.reason}</Text>}
            </View>
            <Text style={[styles.txAmount, item.kind === 'REDEEM' ? styles.txRedeem : styles.txEarn]}>
              {item.kind === 'REDEEM' ? '-' : '+'}৳{parseFloat(item.amount).toFixed(2)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20 },
  cardContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#1E293B', padding: 16, borderRadius: 12 },
  cardLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 6 },
  verifiedAmount: { fontSize: 24, fontWeight: 'bold', color: '#10B981' },
  pendingAmount: { fontSize: 24, fontWeight: 'bold', color: '#F59E0B' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#1E293B', borderRadius: 8, marginBottom: 8 },
  txKind: { color: '#F8FAFC', fontWeight: '600', fontSize: 14 },
  txReason: { color: '#64748B', fontSize: 12, marginTop: 2 },
  txAmount: { fontWeight: 'bold', fontSize: 16 },
  txEarn: { color: '#10B981' },
  txRedeem: { color: '#EF4444' },
});
