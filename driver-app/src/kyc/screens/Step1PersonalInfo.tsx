import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii } from '../../theme';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import type { KycPersonalInfo } from '../types';

interface Props {
  data: KycPersonalInfo;
  onChange: (d: KycPersonalInfo) => void;
  onNext: () => void;
}

const GENDERS: Array<{ id: KycPersonalInfo['gender']; label: string }> = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

export default function Step1PersonalInfo({ data, onChange, onNext }: Props) {
  const [touched, setTouched] = useState(false);

  const set = (patch: Partial<KycPersonalInfo>) => onChange({ ...data, ...patch });

  const errors = {
    fullName: touched && !data.fullName.trim() ? 'Full name is required' : '',
    dob: touched && !data.dob.trim() ? 'Date of birth is required' : '',
    gender: touched && !data.gender ? 'Please select a gender' : '',
    address: touched && data.address.trim().length < 5 ? 'Enter a valid address' : '',
    emergencyContact:
      touched && data.emergencyContact.replace(/\D/g, '').length !== 10
        ? 'Enter a valid 10-digit number'
        : '',
  };

  const isValid =
    data.fullName.trim().length > 0 &&
    data.dob.trim().length > 0 &&
    data.gender !== '' &&
    data.address.trim().length >= 5 &&
    data.emergencyContact.replace(/\D/g, '').length === 10;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  return (
    <KycScreenWrapper
      step={1}
      title="Personal Information"
      subtitle="Tell us about yourself. This information is used for verification."
      onNext={handleNext}
      nextDisabled={false}
      showPrev={false}
    >
      <KycField
        label="Full Name"
        required
        value={data.fullName}
        onChangeText={(v) => set({ fullName: v })}
        placeholder="e.g. Arjun Sharma"
        error={errors.fullName}
        autoCapitalize="words"
      />

      <KycField
        label="Date of Birth"
        required
        value={data.dob}
        onChangeText={(v) => set({ dob: v })}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.dob}
      />

      <View style={styles.genderWrapper}>
        <Text style={styles.fieldLabel}>
          Gender <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => {
            const active = data.gender === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => set({ gender: g.id })}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <KycField
        label="Address"
        required
        value={data.address}
        onChangeText={(v) => set({ address: v })}
        placeholder="Full residential address"
        multiline
        numberOfLines={3}
        style={styles.multiline}
        error={errors.address}
      />

      <KycField
        label="Emergency Contact Number"
        required
        value={data.emergencyContact}
        onChangeText={(v) => set({ emergencyContact: v })}
        placeholder="10-digit mobile number"
        keyboardType="number-pad"
        maxLength={10}
        error={errors.emergencyContact}
      />
    </KycScreenWrapper>
  );
}

const styles = StyleSheet.create({
  genderWrapper: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  required: { color: colors.danger },
  genderRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  chipTextActive: { color: '#FFFFFF' },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: 6 },
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 14 },
});
