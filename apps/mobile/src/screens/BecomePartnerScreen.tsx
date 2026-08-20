import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useApplyPartner, usePartner } from '@/hooks/usePartner';
import { PARTNER_TYPES, type PartnerType } from '@chokro/shared';
import { getErrorMessage } from '@/services/api';

interface BecomePartnerScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function BecomePartnerScreen({ onBack, onSuccess }: BecomePartnerScreenProps) {
  const { data: partnerData } = usePartner();
  const partner = partnerData?.partner;

  const [orgName, setOrgName] = useState(partner?.org_name ?? '');
  const [selectedTypes, setSelectedTypes] = useState<PartnerType[]>(
    partner?.types ? (partner.types as PartnerType[]) : ['COLLECTOR']
  );
  const [eWasteLicensed, setEWasteLicensed] = useState(partner?.e_waste_licensed ?? false);
  const [doeLicenseDoc, setDoeLicenseDoc] = useState(partner?.doe_license_doc ?? '');
  const [capabilities, setCapabilities] = useState({
    collects: partner?.capability_flags?.collects ?? true,
    repairs: partner?.capability_flags?.repairs ?? false,
    buys: partner?.capability_flags?.buys ?? false,
    accepts_donations: partner?.capability_flags?.accepts_donations ?? true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const applyMutation = useApplyPartner();

  // Keep state synced with latest partner data if it loads asynchronously
  useEffect(() => {
    if (partner) {
      if (partner.org_name && !orgName) setOrgName(partner.org_name);
      if (partner.types && partner.types.length > 0) setSelectedTypes(partner.types as PartnerType[]);
      if (partner.e_waste_licensed !== undefined) setEWasteLicensed(partner.e_waste_licensed);
      if (partner.doe_license_doc) setDoeLicenseDoc(partner.doe_license_doc);
      if (partner.capability_flags) {
        setCapabilities({
          collects: Boolean(partner.capability_flags.collects),
          repairs: Boolean(partner.capability_flags.repairs),
          buys: Boolean(partner.capability_flags.buys),
          accepts_donations: Boolean(partner.capability_flags.accepts_donations),
        });
      }
    }
  }, [partner]);

  const toggleType = (t: PartnerType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((x) => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const toggleCapability = (cap: keyof typeof capabilities) => {
    setCapabilities({ ...capabilities, [cap]: !capabilities[cap] });
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!orgName.trim() || orgName.trim().length < 2) {
      setFormError('Please enter a valid organization name (minimum 2 characters).');
      return;
    }

    if (selectedTypes.length === 0) {
      setFormError('Please select at least one organization type.');
      return;
    }

    if (eWasteLicensed && !doeLicenseDoc.trim()) {
      setFormError('DoE License document reference or number is required when applying for e-waste licensing.');
      return;
    }

    try {
      await applyMutation.mutateAsync({
        orgName: orgName.trim(),
        types: selectedTypes,
        eWasteLicensed,
        doeLicenseDoc: doeLicenseDoc.trim() || null,
        capabilityFlags: capabilities,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to submit partner application.'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerClassName="p-5 pb-12">
        {/* Header navigation */}
        <View className="flex-row items-center gap-2 mb-2">
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              className="w-9 h-9 items-center justify-center rounded-xl bg-surface border border-border active:opacity-70"
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
          )}
          <Text className="text-leaf text-xs font-extrabold tracking-widest">PARTNER ONBOARDING</Text>
        </View>

        <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
          {partner?.status === 'APPLIED'
            ? 'Update Partner Application'
            : partner?.status === 'REJECTED'
              ? 'Re-Apply as Partner'
              : 'Become a Verified Partner'}
        </Text>
        <Text className="text-sm text-muted leading-5 mb-5">
          Join Chokro&apos;s network of verified recyclers, collectors, repair shops, and NGOs to receive local circular deposits.
        </Text>

        {/* Pending status banner */}
        {partner?.status === 'APPLIED' ? (
          <View className="bg-amber-soft border border-amber/40 p-3.5 rounded-2xl mb-4 flex-row items-center gap-2.5">
            <Ionicons name="time-outline" size={20} color={colors.amber} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Application Pending Review</Text>
              <Text className="text-[11px] text-muted">
                Your request is currently under review by administrators. Submitting will update your pending application.
              </Text>
            </View>
          </View>
        ) : partner?.status === 'REJECTED' ? (
          <View className="bg-danger-soft border border-danger/40 p-3.5 rounded-2xl mb-4">
            <Text className="text-xs font-bold text-danger mb-1">Previous Application Needs Revision</Text>
            <Text className="text-xs text-ink leading-relaxed">
              {partner.reason || 'Please correct your details or regulatory license and resubmit.'}
            </Text>
          </View>
        ) : null}

        {formError ? (
          <View className="bg-danger-soft border border-danger/30 p-3.5 rounded-2xl mb-4" accessibilityRole="alert">
            <Text className="text-xs font-bold text-danger">{formError}</Text>
          </View>
        ) : null}

        {/* Organization Name input */}
        <View className="mb-4">
          <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-1.5">
            Organization Name <Text className="text-danger">*</Text>
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink font-medium"
            placeholder="e.g. Green Dhaka Recyclers Ltd"
            placeholderTextColor="#9CA3AF"
            value={orgName}
            onChangeText={setOrgName}
            autoCapitalize="words"
          />
        </View>

        {/* Partner Classification Multi-select */}
        <View className="mb-5">
          <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-1.5">
            Organization Type <Text className="text-danger">*</Text>
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PARTNER_TYPES.map((t) => {
              const selected = selectedTypes.includes(t);
              return (
                <Pressable
                  key={t}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className={`px-3.5 py-2 rounded-xl border active:opacity-75 ${
                    selected
                      ? 'bg-leaf border-leaf'
                      : 'bg-surface border-border'
                  }`}
                  onPress={() => toggleType(t)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selected ? 'text-surface' : 'text-ink'
                    }`}
                  >
                    {t.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Operational Capabilities Checkboxes */}
        <View className="mb-5 bg-surface border border-border p-4 rounded-2xl">
          <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-3">
            Operational Capabilities
          </Text>

          <View className="space-y-2.5">
            <Pressable
              className="flex-row items-center justify-between py-1"
              onPress={() => toggleCapability('collects')}
            >
              <Text className="text-sm font-semibold text-ink">Collects items from campuses & drop zones</Text>
              <Ionicons
                name={capabilities.collects ? 'checkbox' : 'square-outline'}
                size={22}
                color={capabilities.collects ? colors.leaf : colors.muted}
              />
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between py-1"
              onPress={() => toggleCapability('repairs')}
            >
              <Text className="text-sm font-semibold text-ink">Repairs electronics / appliances</Text>
              <Ionicons
                name={capabilities.repairs ? 'checkbox' : 'square-outline'}
                size={22}
                color={capabilities.repairs ? colors.leaf : colors.muted}
              />
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between py-1"
              onPress={() => toggleCapability('buys')}
            >
              <Text className="text-sm font-semibold text-ink">Buys recyclable scrap / commercial lots</Text>
              <Ionicons
                name={capabilities.buys ? 'checkbox' : 'square-outline'}
                size={22}
                color={capabilities.buys ? colors.leaf : colors.muted}
              />
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between py-1"
              onPress={() => toggleCapability('accepts_donations')}
            >
              <Text className="text-sm font-semibold text-ink">Accepts reusable donations for communities</Text>
              <Ionicons
                name={capabilities.accepts_donations ? 'checkbox' : 'square-outline'}
                size={22}
                color={capabilities.accepts_donations ? colors.leaf : colors.muted}
              />
            </Pressable>
          </View>
        </View>

        {/* E-Waste Licensing Toggle */}
        <View className="bg-surface border border-border p-4 rounded-2xl mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-extrabold text-ink">Department of Environment (DoE) Licensed</Text>
              <Text className="text-xs text-muted leading-4 mt-0.5">
                Required for processing hazardous electronic waste and commercial e-waste lots.
              </Text>
            </View>
            <Switch
              value={eWasteLicensed}
              onValueChange={setEWasteLicensed}
              trackColor={{ false: '#D1D5DB', true: colors.leaf }}
              thumbColor="#FFFFFF"
            />
          </View>

          {eWasteLicensed && (
            <View className="mt-4 pt-3 border-t border-border">
              <Text className="text-xs font-bold text-ink mb-1.5">
                DoE License Certificate Reference / Document ID <Text className="text-danger">*</Text>
              </Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-ink"
                placeholder="e.g. DOE-EW-2026-9941"
                placeholderTextColor="#9CA3AF"
                value={doeLicenseDoc}
                onChangeText={setDoeLicenseDoc}
                autoCapitalize="characters"
              />
              <Text className="text-[11px] text-muted mt-1">
                Admin operators will verify this reference against Department of Environment records.
              </Text>
            </View>
          )}
        </View>

        {/* Submit action button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit partner application"
          disabled={applyMutation.isPending}
          className="min-h-[52px] rounded-2xl bg-leaf items-center justify-center shadow-md active:opacity-75"
          onPress={handleSubmit}
        >
          {applyMutation.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text className="text-surface text-base font-extrabold">Submit Partner Application</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
