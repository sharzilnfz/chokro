import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
import { categoryLabel } from '../types';

type DropZone = {
  id: string;
  name: string;
  status: string;
  acceptedCategories?: string[];
  accepted_categories?: string[];
  institutionId?: string;
  institution_id?: string;
};

function extractToken(payload: string): string {
  const trimmed = payload.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

export function QRScannerScreen({ token }: { token: string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zone, setZone] = useState<DropZone | null>(null);
  const resolvingRef = useRef(false);

  const resolveToken = async (rawToken: string) => {
    const zoneToken = extractToken(rawToken);
    if (!zoneToken) {
      setError('Enter or scan a Drop Zone token.');
      return;
    }
    if (resolvingRef.current) return;

    resolvingRef.current = true;
    setLoading(true);
    setScanning(false);
    setError('');
    setZone(null);
    try {
      const data = await apiRequest<{ zone: DropZone }>(`/api/drop-zones/resolve?token=${encodeURIComponent(zoneToken)}`, { token });
      if (!data.zone) throw new Error('The API did not return a Drop Zone.');
      setZone(data.zone);
      setManualToken(zoneToken);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'This QR code could not be resolved.'));
    } finally {
      resolvingRef.current = false;
      setLoading(false);
    }
  };

  const handleBarcode = (result: BarcodeScanningResult) => {
    if (!scanning || loading) return;
    void resolveToken(result.data);
  };

  const scanAgain = () => {
    setZone(null);
    setError('');
    setManualToken('');
    setScanning(true);
  };

  const acceptedCategories = zone?.acceptedCategories ?? zone?.accepted_categories ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SIGNED ZONE RECOGNITION</Text>
      <Text accessibilityRole="header" style={styles.title}>Scan a Drop Zone</Text>
      <Text style={styles.subtitle}>Recognize a registered zone before you visit. Sprint 1 does not create a deposit or Green Credits.</Text>

      {!permission ? (
        <View style={styles.cameraState} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.leaf} />
          <Text style={styles.cameraStateText}>Checking camera permission</Text>
        </View>
      ) : !permission.granted ? (
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={31} color={colors.leaf} />
          <Text style={styles.permissionTitle}>Camera permission needed</Text>
          <Text style={styles.permissionCopy}>Chokro uses the camera only to read the signed QR code on a Drop Zone poster.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.primaryText}>Allow camera</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraShell}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning && !loading ? handleBarcode : undefined}
            accessibilityLabel="QR camera view"
          />
          <View pointerEvents="none" style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.cameraHint}>{scanning ? 'Hold the poster QR inside the frame' : loading ? 'Resolving signed token...' : 'Scan paused'}</Text>
          </View>
        </View>
      )}

      <View style={styles.manualCard}>
        <Text style={styles.manualTitle}>Enter a token instead</Text>
        <TextInput
          accessibilityLabel="Drop Zone token"
          style={styles.input}
          placeholder="CHOKRO-QR-..."
          placeholderTextColor={colors.muted}
          value={manualToken}
          onChangeText={setManualToken}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          onSubmitEditing={() => void resolveToken(manualToken)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resolve Drop Zone token"
          accessibilityState={{ disabled: loading, busy: loading }}
          style={({ pressed }) => [styles.resolveButton, pressed && styles.pressed, loading && styles.disabled]}
          disabled={loading}
          onPress={() => void resolveToken(manualToken)}
        >
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Check zone</Text>}
        </Pressable>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
          <View style={styles.messageBody}>
            <Text style={styles.errorTitle}>Zone not recognized</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan another QR code"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={scanAgain}
          >
            <Ionicons name="refresh" size={21} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}

      {zone ? (
        <View accessibilityRole="summary" style={styles.zoneCard}>
          <View style={styles.zoneIcon}>
            <Ionicons name="location" size={25} color={colors.surface} />
          </View>
          <Text style={styles.zoneEyebrow}>REGISTERED DROP ZONE</Text>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{categoryLabel(zone.status)}</Text>
          </View>
          <Text style={styles.acceptedLabel}>Accepted categories</Text>
          <View style={styles.categoryRow}>
            {acceptedCategories.length > 0 ? acceptedCategories.map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{categoryLabel(category)}</Text>
              </View>
            )) : <Text style={styles.unknownText}>No accepted categories were returned by the API.</Text>}
          </View>
          <View style={styles.scopeNotice}>
            <Ionicons name="information-circle-outline" size={21} color={colors.amber} />
            <Text style={styles.scopeText}>Zone recognized only. No deposit was recorded and no credit was created.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan another Drop Zone"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={scanAgain}
          >
            <Ionicons name="scan-outline" size={20} color={colors.leafDark} />
            <Text style={styles.secondaryText}>Scan another zone</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: colors.leaf, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 18 },
  cameraState: { height: 300, borderRadius: radii.large, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cameraStateText: { color: colors.muted, fontSize: 13, marginTop: 9 },
  cameraShell: { height: 310, borderRadius: radii.large, overflow: 'hidden', backgroundColor: colors.ink, ...shadows.card },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10, 22, 15, 0.16)' },
  scanFrame: { width: 205, height: 205, borderWidth: 3, borderColor: colors.surface, borderRadius: 22 },
  cameraHint: { position: 'absolute', bottom: 18, color: colors.surface, fontSize: 12, fontWeight: '800', backgroundColor: colors.overlay, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, overflow: 'hidden' },
  permissionCard: { minHeight: 260, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, ...shadows.card },
  permissionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 10 },
  permissionCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 15 },
  primaryButton: { minWidth: 170, minHeight: 50, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  manualCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, padding: 15, marginTop: 13 },
  manualTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, color: colors.ink, fontSize: 14, paddingHorizontal: 13, marginBottom: 9 },
  resolveButton: { minHeight: 50, borderRadius: 13, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radii.medium, padding: 14, marginTop: 13 },
  messageBody: { flex: 1 },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 2 },
  iconButton: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  zoneCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.leaf, borderRadius: radii.large, padding: 19, marginTop: 13, ...shadows.card },
  zoneIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  zoneEyebrow: { color: colors.leaf, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  zoneName: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.leafSoft, borderRadius: radii.pill, paddingHorizontal: 11, marginTop: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.leaf },
  statusText: { color: colors.leafDark, fontSize: 11, fontWeight: '800' },
  acceptedLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: { minHeight: 36, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  categoryText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  unknownText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  scopeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.amberSoft, borderRadius: 12, padding: 12, marginTop: 16 },
  scopeText: { flex: 1, color: colors.amber, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  secondaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.leaf, borderRadius: 14, marginTop: 13 },
  secondaryText: { color: colors.leafDark, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
});
