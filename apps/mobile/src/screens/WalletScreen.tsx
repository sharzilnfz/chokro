import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
import { categoryLabel } from '../types';

type Balance = { verified: number; pending: number };
type CreditTransaction = {
  id: string;
  amount: string | number;
  kind: 'EARN' | 'REDEEM' | 'ADJUST';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reason?: string | null;
  source_id?: string | null;
  created_at?: string;
};

export function WalletScreen({ token }: { token: string }) {
  const [balance, setBalance] = useState<Balance>({ verified: 0, pending: 0 });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadWallet = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [balanceData, transactionData] = await Promise.all([
        apiRequest<{ balance: Balance }>('/api/wallet/balance', { token }),
        apiRequest<{ transactions: CreditTransaction[] }>('/api/wallet/transactions', { token }),
      ]);
      setBalance({
        verified: Number(balanceData.balance?.verified ?? 0),
        pending: Number(balanceData.balance?.pending ?? 0),
      });
      setTransactions(Array.isArray(transactionData.transactions) ? transactionData.transactions : []);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not load your wallet.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        <Text style={styles.stateTitle}>Loading your ledger</Text>
        <Text style={styles.stateCopy}>Balances are derived from transaction history.</Text>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View style={styles.centered} accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text style={styles.stateTitle}>Wallet unavailable</Text>
        <Text style={styles.stateCopy}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading wallet"
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={() => void loadWallet()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadWallet(true)}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.eyebrow}>APPEND-ONLY LEDGER</Text>
          <Text accessibilityRole="header" style={styles.title}>Green Credits</Text>
          <Text style={styles.subtitle}>One credit equals ৳1. Only verified outcomes count toward spendable balance.</Text>

          <View style={styles.verifiedCard} accessibilityLabel={`Verified balance ${balance.verified.toFixed(2)} Green Credits`}>
            <View style={styles.balanceIcon}>
              <Ionicons name="shield-checkmark" size={23} color={colors.surface} />
            </View>
            <Text style={styles.verifiedLabel}>VERIFIED BALANCE</Text>
            <Text style={styles.verifiedAmount}>{balance.verified.toFixed(2)}</Text>
            <Text style={styles.verifiedUnit}>Green Credits</Text>
          </View>

          <View style={styles.pendingCard} accessibilityLabel={`Pending balance ${balance.pending.toFixed(2)} Green Credits`}>
            <View>
              <Text style={styles.pendingLabel}>Pending verification</Text>
              <Text style={styles.pendingCopy}>Not spendable until a Trust Gate decision verifies the outcome.</Text>
            </View>
            <Text style={styles.pendingAmount}>{balance.pending.toFixed(2)}</Text>
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.inlineError}>{error}</Text> : null}
          <Text style={styles.sectionTitle}>Ledger history</Text>
        </View>
      }
      renderItem={({ item }) => {
        const amount = Number(item.amount ?? 0);
        const isDebit = amount < 0;
        const isCredit = amount > 0;
        const sign = isDebit ? '-' : '+';
        const statusColor = item.status === 'VERIFIED' ? colors.leafDark : item.status === 'PENDING' ? colors.amber : colors.danger;
        return (
          <View style={styles.transaction} accessibilityLabel={`${categoryLabel(item.kind)} ${Math.abs(amount).toFixed(2)} credits, ${categoryLabel(item.status)}`}>
            <View style={[styles.transactionIcon, { backgroundColor: isDebit ? colors.dangerSoft : colors.leafSoft }]}>
              <Ionicons name={isDebit ? 'arrow-up' : 'arrow-down'} size={19} color={isDebit ? colors.danger : colors.leafDark} />
            </View>
            <View style={styles.transactionBody}>
              <Text style={styles.transactionKind}>{categoryLabel(item.kind)}</Text>
              <Text style={[styles.transactionStatus, { color: statusColor }]}>{categoryLabel(item.status)}</Text>
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
            </View>
            <Text style={[styles.transactionAmount, isDebit && styles.redeemAmount]}>{sign}{Math.abs(amount).toFixed(2)}</Text>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={31} color={colors.leaf} />
          <Text style={styles.emptyTitle}>No ledger entries yet</Text>
          <Text style={styles.emptyCopy}>Recognizing a Drop Zone in Sprint 1 does not create a deposit or credit.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 28 },
  eyebrow: { color: colors.leaf, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 18 },
  verifiedCard: { backgroundColor: colors.leafDark, borderRadius: radii.large, padding: 20, minHeight: 190, justifyContent: 'flex-end', ...shadows.card },
  balanceIcon: { position: 'absolute', top: 18, right: 18, width: 48, height: 48, borderRadius: 16, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  verifiedLabel: { color: '#BBD5C5', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  verifiedAmount: { color: colors.surface, fontSize: 47, lineHeight: 53, fontWeight: '800', letterSpacing: -1.8, marginTop: 4 },
  verifiedUnit: { color: '#DCEADF', fontSize: 13, fontWeight: '600' },
  pendingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderWidth: 1, borderColor: '#E4C991', borderRadius: radii.medium, backgroundColor: colors.amberSoft, padding: 16, marginTop: 12 },
  pendingLabel: { color: colors.amber, fontSize: 14, fontWeight: '800' },
  pendingCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 230 },
  pendingAmount: { color: colors.amber, fontSize: 24, fontWeight: '800' },
  inlineError: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10, marginTop: 12, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  transaction: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, padding: 13, marginBottom: 9, ...shadows.card },
  transactionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  transactionBody: { flex: 1, marginHorizontal: 11 },
  transactionKind: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  transactionStatus: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  reason: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  transactionAmount: { color: colors.leafDark, fontSize: 16, fontWeight: '800' },
  redeemAmount: { color: colors.danger },
  emptyBox: { alignItems: 'center', padding: 28, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 9 },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 11 },
  stateCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  retryButton: { minWidth: 132, minHeight: 48, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
