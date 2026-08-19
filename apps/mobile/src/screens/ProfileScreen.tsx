// ProfileScreen allows users to edit full name, phone, campus affiliation, and student ID photo.
// Supports both selecting an existing verified campus or submitting a new unlisted institution.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIVISIONS, type Division } from '@chokro/shared';
import { colors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StateView } from '@/components/ui/StateView';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useCampuses } from '@/hooks/useCampuses';
import { pickAndCompressPhoto, type PreparedPhoto } from '@/lib/photo';
import { getErrorMessage } from '@/services/api';

interface ProfileScreenProps {
  onBack?: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { data: profileData, isLoading: isProfileLoading, error: profileError, refetch } = useProfile();
  const { data: campuses = [], isLoading: isCampusesLoading } = useCampuses();
  const updateMutation = useUpdateProfile();

  const user = profileData?.user;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  
  // Selection mode: null = "not a student", string = verified campus slug, "NEW_UNLISTED" = custom campus
  const [selectedCampusSlug, setSelectedCampusSlug] = useState<string | null>(user?.institutionId ?? null);
  const [isUnlistedMode, setIsUnlistedMode] = useState(false);

  // Unlisted campus form fields
  const [unlistedName, setUnlistedName] = useState('');
  const [unlistedDivision, setUnlistedDivision] = useState<Division>('DHAKA');
  const [unlistedZilla, setUnlistedZilla] = useState('');
  const [unlistedUpazilla, setUnlistedUpazilla] = useState('');

  const [studentPhoto, setStudentPhoto] = useState<PreparedPhoto | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync state when profile loads
  useEffect(() => {
    if (user) {
      if (user.fullName !== null && user.fullName !== undefined) setFullName(user.fullName);
      if (user.phone !== null && user.phone !== undefined) setPhone(user.phone);
      if (user.institutionId !== undefined) {
        setSelectedCampusSlug(user.institutionId);
      }
      if (user.studentIdDoc && !studentPhoto) {
        setStudentPhoto({
          previewUri: user.studentIdDoc,
          dataUri: user.studentIdDoc,
          width: 800,
          height: 600,
          bytes: user.studentIdDoc.length,
        });
      }
    }
  }, [user]);

  async function handlePickPhoto() {
    setFormError(null);
    setIsPreparingPhoto(true);
    try {
      const prepared = await pickAndCompressPhoto();
      if (prepared) {
        setStudentPhoto(prepared);
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not choose photo.'));
    } finally {
      setIsPreparingPhoto(false);
    }
  }

  function handleRemovePhoto() {
    setStudentPhoto(null);
  }

  async function handleSave() {
    setFormError(null);
    setSuccessNotice(null);

    const isStudent = selectedCampusSlug !== null || isUnlistedMode;

    // Student ID photo is mandatory for any student affiliation
    if (isStudent && !studentPhoto?.dataUri) {
      setFormError('Please upload a photo of your student ID card to verify your university affiliation.');
      return;
    }

    // Validate unlisted campus fields if in unlisted mode
    if (isUnlistedMode) {
      if (!unlistedName.trim() || !unlistedZilla.trim() || !unlistedUpazilla.trim()) {
        setFormError('Please complete the institution name, district, and area for your unlisted campus.');
        return;
      }
    }

    try {
      if (isUnlistedMode) {
        await updateMutation.mutateAsync({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() ? phone.trim() : null,
          newCampus: {
            name: unlistedName.trim(),
            division: unlistedDivision,
            zilla: unlistedZilla.trim(),
            upazilla: unlistedUpazilla.trim(),
          },
          studentIdDoc: studentPhoto?.dataUri ?? null,
        });
        setIsUnlistedMode(false);
        setSuccessNotice('Your unlisted campus request has been submitted for admin verification!');
      } else {
        await updateMutation.mutateAsync({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() ? phone.trim() : null,
          campusSlug: selectedCampusSlug,
          studentIdDoc: selectedCampusSlug ? (studentPhoto ? studentPhoto.dataUri : null) : null,
        });
        setSuccessNotice('Profile updated successfully!');
      }
      void refetch();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to update profile.'));
    }
  }

  const isLoading = isProfileLoading || isCampusesLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface-muted"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with back button */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center active:opacity-70"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text className="text-xs font-bold text-muted uppercase tracking-wider">Account Settings</Text>
          <View className="w-10" />
        </View>

        <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
          Edit Profile
        </Text>
        <Text className="text-sm text-muted leading-5 mb-5">
          Manage your personal details, educational institution, and student verification.
        </Text>

        {/* Informative banner if current campus is Pending or Blacklisted */}
        {user?.campusStatus === 'PENDING' && (
          <View className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl mb-4 flex-row items-center gap-2">
            <Ionicons name="time-outline" size={20} color="#D97706" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-amber-900">Campus Verification Pending</Text>
              <Text className="text-[11px] text-amber-800 mt-0.5">
                "{user.campusName}" is currently pending admin review. It will count toward leaderboards once approved.
              </Text>
            </View>
          </View>
        )}

        {user?.campusStatus === 'BLACKLISTED' && (
          <View className="p-3.5 bg-red-50 border border-red-300 rounded-2xl mb-4 flex-row items-center gap-2">
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-red-900">Campus Blacklisted</Text>
              <Text className="text-[11px] text-red-800 mt-0.5">
                "{user.campusName}" has been blacklisted: {user.campusReason || 'Policy violation'}. Please select a verified campus.
              </Text>
            </View>
          </View>
        )}

        {successNotice ? (
          <View className="p-3.5 bg-leaf-soft border border-leaf/40 rounded-2xl mb-4 flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color={colors.leafDark} />
            <Text className="text-xs font-bold text-leaf-dark flex-1">{successNotice}</Text>
          </View>
        ) : null}

        {formError ? <ErrorBanner message={formError} /> : null}

        {isLoading ? (
          <StateView isLoading loadingTitle="Loading your profile..." />
        ) : (
          <View className="bg-surface border border-border rounded-2xl p-4 shadow-card mb-5">
            {/* Personal Details Section */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                1. Personal Information
              </Text>

              <Input
                label="Full name"
                placeholder="e.g. Sadat Nafis"
                value={fullName}
                onChangeText={setFullName}
              />

              <Input
                label="Phone number"
                placeholder="e.g. 01711223344"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <View className="p-3 bg-surface-muted rounded-xl mt-1">
                <Text className="text-[11px] text-muted">Email address (cannot be changed)</Text>
                <Text className="text-xs font-bold text-ink mt-0.5">{user?.email}</Text>
              </View>
            </View>

            {/* Campus Affiliation Section */}
            <View className="mt-2 mb-4 pt-4 border-t border-border">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                2. Educational Institution
              </Text>
              <Text className="text-[11px] text-muted leading-4 mb-3">
                Select your campus to contribute your verified Green Credits to the inter-campus leaderboard.
              </Text>

              <View className="flex-row flex-wrap gap-2 mb-3" role="radiogroup">
                {/* Not a student chip */}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedCampusSlug === null && !isUnlistedMode }}
                  className={`px-3 py-2 rounded-xl border active:opacity-75 ${
                    selectedCampusSlug === null && !isUnlistedMode
                      ? 'bg-ink border-ink'
                      : 'bg-surface border-border'
                  }`}
                  onPress={() => {
                    setSelectedCampusSlug(null);
                    setIsUnlistedMode(false);
                    setStudentPhoto(null);
                  }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedCampusSlug === null && !isUnlistedMode ? 'text-surface' : 'text-muted'
                    }`}
                  >
                    Not a student
                  </Text>
                </Pressable>

                {/* Campus chips */}
                {campuses.map((campus) => {
                  const isSelected = selectedCampusSlug === campus.slug && !isUnlistedMode;
                  return (
                    <Pressable
                      key={campus.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      className={`px-3 py-2 rounded-xl border active:opacity-75 ${
                        isSelected
                          ? 'bg-leaf-soft border-leaf'
                          : 'bg-surface border-border'
                      }`}
                      onPress={() => {
                        setSelectedCampusSlug(campus.slug);
                        setIsUnlistedMode(false);
                      }}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-leaf-dark' : 'text-ink'
                        }`}
                      >
                        {campus.name}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Add Unlisted Campus Chip */}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isUnlistedMode }}
                  className={`px-3 py-2 rounded-xl border active:opacity-75 flex-row items-center gap-1 ${
                    isUnlistedMode
                      ? 'bg-leaf-soft border-leaf'
                      : 'bg-surface border-dashed border-border'
                  }`}
                  onPress={() => {
                    setIsUnlistedMode(true);
                    setSelectedCampusSlug(null);
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={isUnlistedMode ? colors.leafDark : colors.muted}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      isUnlistedMode ? 'text-leaf-dark' : 'text-muted'
                    }`}
                  >
                    My Campus is not listed
                  </Text>
                </Pressable>
              </View>

              {/* Unlisted Campus Details Form */}
              {isUnlistedMode && (
                <View className="p-3.5 bg-leaf-soft/40 border border-leaf/30 rounded-xl mb-3">
                  <Text className="text-xs font-extrabold text-leaf-dark mb-2">
                    Submit New Educational Institution
                  </Text>
                  <Text className="text-[11px] text-muted mb-3">
                    Your campus will officially be registered in Chokro. An admin will review and verify it.
                  </Text>

                  <Input
                    label="Campus / Institution Name"
                    placeholder="e.g. United International University"
                    value={unlistedName}
                    onChangeText={setUnlistedName}
                  />

                  <View className="mb-3">
                    <Text className="text-xs font-bold text-slate-700 mb-1">Division</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {DIVISIONS.map((d) => (
                        <Pressable
                          key={d}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                            unlistedDivision === d
                              ? 'bg-leaf text-white border-leaf'
                              : 'bg-surface border-border'
                          }`}
                          onPress={() => setUnlistedDivision(d)}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              unlistedDivision === d ? 'text-white' : 'text-slate-700'
                            }`}
                          >
                            {d}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <Input
                    label="District / Zilla"
                    placeholder="e.g. Dhaka"
                    value={unlistedZilla}
                    onChangeText={setUnlistedZilla}
                  />

                  <Input
                    label="Upazilla / Area"
                    placeholder="e.g. Madani Avenue"
                    value={unlistedUpazilla}
                    onChangeText={setUnlistedUpazilla}
                  />
                </View>
              )}
            </View>

            {/* Student ID Card Upload Section */}
            {(selectedCampusSlug !== null || isUnlistedMode) && (
              <View className="mt-2 mb-4 pt-4 border-t border-border">
                <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                  3. Student ID Verification (Required)
                </Text>
                <Text className="text-[11px] text-muted leading-4 mb-3">
                  Upload a clear photo of your student ID card to link your institutional leaderboard standing.
                </Text>

                {studentPhoto ? (
                  <View className="h-48 rounded-xl overflow-hidden bg-surface-muted border border-border relative">
                    <Image
                      source={{ uri: studentPhoto.previewUri }}
                      className="w-full h-full"
                      style={{ resizeMode: 'cover' }}
                      accessibilityLabel="Student ID photo preview"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove student ID photo"
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 items-center justify-center active:opacity-75"
                      onPress={handleRemovePhoto}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Upload student ID photo"
                    accessibilityState={{ busy: isPreparingPhoto }}
                    className="h-36 border border-dashed border-leaf rounded-xl bg-leaf-soft/50 items-center justify-center p-4 active:opacity-75"
                    disabled={isPreparingPhoto}
                    onPress={handlePickPhoto}
                  >
                    {isPreparingPhoto ? (
                      <ActivityIndicator color={colors.leaf} />
                    ) : (
                      <Ionicons name="camera-outline" size={28} color={colors.leafDark} />
                    )}
                    <Text className="text-xs font-extrabold text-leaf-dark mt-2">
                      {isPreparingPhoto ? 'Preparing photo...' : 'Choose Student ID Photo'}
                    </Text>
                    <Text className="text-[10px] text-muted text-center mt-1">
                      JPEG format, compressed automatically under 500 KB.
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <Button
              label={isUnlistedMode ? 'Submit Campus & Update Profile' : 'Save Profile'}
              loading={updateMutation.isPending}
              onPress={() => void handleSave()}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
