import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput } from 'react-native';

export function QRScannerScreen({ token, onDepositSuccess }: { token: string; onDepositSuccess: () => void }) {
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScanToken = async (scannedToken: string) => {
    if (!scannedToken) return;

    try {
      setLoading(true);
      Alert.alert('QR Scanned', `Scanned Zone Token: ${scannedToken}\nProceed with deposit?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deposit Item',
          onPress: () => {
            Alert.alert('Success', 'Deposit recorded as PENDING verification!');
            onDepositSuccess();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Invalid QR Token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Drop-Zone QR</Text>
      <View style={styles.scannerBox}>
        <Text style={styles.scannerText}>[ Camera Scanner Active ]</Text>
        <Text style={styles.subtext}>Point camera at Drop-Zone poster QR code</Text>
      </View>

      <Text style={styles.label}>Or enter QR token manually:</Text>
      <TextInput
        style={styles.input}
        placeholder="CHOKRO-QR-..."
        placeholderTextColor="#64748B"
        value={manualToken}
        onChangeText={setManualToken}
      />
      <TouchableOpacity style={styles.button} onPress={() => handleScanToken(manualToken)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Submit Deposit'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20, textAlign: 'center' },
  scannerBox: { height: 220, backgroundColor: '#1E293B', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  scannerText: { color: '#10B981', fontWeight: 'bold', fontSize: 18 },
  subtext: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  label: { color: '#94A3B8', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#1E293B', color: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});
