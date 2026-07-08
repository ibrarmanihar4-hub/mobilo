import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../../theme';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycVehicle, VehicleType } from '../types';

interface Props {
  data: KycVehicle;
  onChange: (d: KycVehicle) => void;
  onPrev: () => void;
  onNext: () => void;
}

const VEHICLE_TYPES: Array<{ id: VehicleType; label: string; icon: string }> = [
  { id: 'car', label: 'Car', icon: 'car' },
  { id: 'bike', label: 'Bike', icon: 'bicycle' },
  { id: 'auto', label: 'Auto', icon: 'car-sport' },
  { id: 'bus', label: 'Bus', icon: 'bus' },
];

export default function Step6Vehicle({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loadingFront, setLoadingFront] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);

  const set = (patch: Partial<KycVehicle>) => onChange({ ...data, ...patch });

  const errors = {
    vehicleType: touched && !data.vehicleType ? 'Select a vehicle type' : '',
    vehicleNumber: touched && data.vehicleNumber.trim().length < 5 ? 'Enter a valid vehicle number' : '',
    vehicleModel: touched && !data.vehicleModel.trim() ? 'Vehicle model is required' : '',
    vehicleColor: touched && !data.vehicleColor.trim() ? 'Vehicle color is required' : '',
    rcNumber: touched && data.rcNumber.trim().length < 5 ? 'Enter a valid RC number' : '',
    rcFrontImage: touched && !data.rcFrontImage ? 'RC front image is required' : '',
    rcBackImage: touched && !data.rcBackImage ? 'RC back image is required' : '',
  };

  const isValid =
    !!data.vehicleType &&
    data.vehicleNumber.trim().length >= 5 &&
    !!data.vehicleModel.trim() &&
    !!data.vehicleColor.trim() &&
    data.rcNumber.trim().length >= 5 &&
    !!data.rcFrontImage &&
    !!data.rcBackImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  return (
    <KycScreenWrapper
      step={6}
      title="Vehicle Information"
      subtitle="Provide details about the vehicle you will use for rides."
      onPrev={onPrev}
      onNext={handleNext}
    >
      {/* Vehicle Type Selector */}
      <View style={styles.fieldWrapper}>
        <Text style={styles.fieldLabel}>
          Vehicle Type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((v) => {
            const active = data.vehicleType === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                onPress={() => set({ vehicleType: v.id })}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={v.icon as any}
                  size={20}
                  color={active ? '#FFFFFF' : colors.inkMuted}
                />
                <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.vehicleType ? (
          <Text style={styles.errorText}>{errors.vehicleType}</Text>
        ) : null}
      </View>

      <KycField
        label="Vehicle Number"
        required
        value={data.vehicleNumber}
        onChangeText={(v) => set({ vehicleNumber: v.toUpperCase() })}
        placeholder="e.g. MH09AB1234"
        autoCapitalize="characters"
        error={errors.vehicleNumber}
      />

      <KycField
        label="Vehicle Model"
        required
        value={data.vehicleModel}
        onChangeText={(v) => set({ vehicleModel: v })}
        placeholder="e.g. Hyundai Aura"
        autoCapitalize="words"
        error={errors.vehicleModel}
      />

      <KycField
        label="Vehicle Color"
        required
        value={data.vehicleColor}
        onChangeText={(v) => set({ vehicleColor: v })}
        placeholder="e.g. White"
        autoCapitalize="words"
        error={errors.vehicleColor}
      />

      <KycField
        label="RC Number"
        required
        value={data.rcNumber}
        onChangeText={(v) => set({ rcNumber: v.toUpperCase() })}
        placeholder="Registration Certificate Number"
        autoCapitalize="characters"
        error={errors.rcNumber}
      />

      <KycUploadCard
        label="RC Front Image"
        sublabel="Front side of your Registration Certificate"
        imageUri={data.rcFrontImage}
        onPick={async () => {
          setLoadingFront(true);
          const uri = await pickImage();
          setLoadingFront(false);
          if (uri) set({ rcFrontImage: uri });
        }}
        loading={loadingFront}
        required
      />

      <KycUploadCard
        label="RC Back Image"
        sublabel="Back side of your Registration Certificate"
        imageUri={data.rcBackImage}
        onPick={async () => {
          setLoadingBack(true);
          const uri = await pickImage();
          setLoadingBack(false);
          if (uri) set({ rcBackImage: uri });
        }}
        loading={loadingBack}
        required
      />
    </KycScreenWrapper>
  );
}

const styles = StyleSheet.create({
  fieldWrapper: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  required: { color: colors.danger },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleChip: {
    width: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  vehicleChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  vehicleChipText: { fontSize: 14, fontWeight: '700', color: colors.inkMuted },
  vehicleChipTextActive: { color: '#FFFFFF' },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: 6 },
});
