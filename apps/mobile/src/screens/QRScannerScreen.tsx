import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { parseDropZoneToken } from '@/lib/qr';
import { DropZoneResultCard, type DropZone } from '@/components/DropZoneResultCard';

const EMPTY_CATEGORIES: string[] = [];

export function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zone, setZone] = useState<DropZone | null>(null);
  const resolvingRef = useRef(false);

  const resolveToken = useCallback(
    async (rawToken: string) => {
      const zoneToken = parseDropZoneToken(rawToken);
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
        const data = await apiRequest<{ zone: DropZone }>(`/api/drop-zones/resolve?token=${encodeURIComponent(zoneToken)}`);
        if (!data.zone) throw new Error('The API did not return a Drop Zone.');
        setZone(data.zone);
        setManualToken(zoneToken);
      } catch (nextError) {
        setError(getErrorMessage(nextError, 'This QR code could not be resolved.'));
      } finally {
        resolvingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      void resolveToken(result.data);
    },
    [resolveToken],
  );

  const scanAgain = useCallback(() => {
    setZone(null);
    setError('');
    setManualToken('');
    setScanning(true);
  }, []);

  const acceptedCategories = zone?.acceptedCategories ?? EMPTY_CATEGORIES;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-[20px] pb-[36px]" keyboardShouldPersistTaps="handled">
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">SIGNED ZONE RECOGNITION</Text>
      <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Scan a Drop Zone</Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">Recognize a registered zone before you visit. Sprint 1 does not create a deposit or Green Credits.</Text>

      {!permission ? (
        <View className="h-[300px] rounded-lg bg-surface-muted items-center justify-center" accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.leaf} />
          <Text className="text-muted text-[13px] mt-[9px]">Checking camera permission</Text>
        </View>
      ) : !permission.granted ? (
        <View className="min-h-[260px] border border-border rounded-lg bg-surface items-center justify-center p-[24px] shadow-card" style={{ elevation: 2 }}>
          <Ionicons name="camera-outline" size={31} color={colors.leaf} />
          <Text className="text-ink text-[18px] font-extrabold mt-[10px]">Camera permission needed</Text>
          <Text className="text-muted text-[13px] leading-[20px] text-center mt-[6px] mb-[15px]">Chokro uses the camera only to read the signed QR code on a Drop Zone poster.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
            className="min-w-[170px] min-h-[50px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"
            onPress={() => void requestPermission()}
          >
            <Text className="text-surface text-[15px] font-extrabold">Allow camera</Text>
          </Pressable>
        </View>
      ) : (
        <View className="h-[310px] rounded-lg overflow-hidden bg-ink shadow-card" style={{ elevation: 2 }}>
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning && !loading ? handleBarcode : undefined}
            accessibilityLabel="QR camera view"
          />
          <View pointerEvents="none" className="absolute top-0 right-0 bottom-0 left-0 items-center justify-center bg-[#0a160f]/16">
            <View className="w-[205px] h-[205px] border-[3px] border-surface rounded-[22px]" />
            <Text className="absolute bottom-[18px] text-surface text-[12px] font-extrabold bg-overlay px-[12px] py-[8px] rounded-pill overflow-hidden">{loading ? 'Resolving signed token...' : scanning ? 'Hold the poster QR inside the frame' : 'Scan paused'}</Text>
          </View>
        </View>
      )}

      <View className="bg-surface border border-border rounded-md p-[15px] mt-[13px]">
        <Text className="text-ink text-[14px] font-extrabold mb-[8px]">Enter a token instead</Text>
        <TextInput
          accessibilityLabel="Drop Zone token"
          className="min-h-[52px] border border-border rounded-[12px] bg-background text-ink text-[14px] px-[13px] mb-[9px]"
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
          className={`min-h-[50px] rounded-[13px] bg-leaf items-center justify-center active:opacity-[0.72] ${loading ? 'opacity-[0.55]' : ''}`}
          disabled={loading}
          onPress={() => void resolveToken(manualToken)}
        >
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text className="text-surface text-[15px] font-extrabold">Check zone</Text>}
        </Pressable>
      </View>

      {error ? (
        <View accessibilityRole="alert" className="flex-row items-start gap-[10px] bg-danger-soft rounded-md p-[14px] mt-[13px]">
          <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
          <View className="flex-1">
            <Text className="text-danger text-[14px] font-extrabold">Zone not recognized</Text>
            <Text className="text-danger text-[12px] leading-[18px] mt-[2px]">{error}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan another QR code"
            className="w-[48px] h-[48px] rounded-[15px] items-center justify-center active:opacity-[0.72]"
            onPress={scanAgain}
          >
            <Ionicons name="refresh" size={21} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}

      {zone ? (
        <DropZoneResultCard
          zone={zone}
          acceptedCategories={acceptedCategories}
          onScanAgain={scanAgain}
        />
      ) : null}
    </ScrollView>
  );
}
