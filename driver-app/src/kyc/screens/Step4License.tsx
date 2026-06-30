import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycLicense } from '../types';

interface Props {
  data: KycLicense;
  onChange: (d: KycLicense) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step4License({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loadingFront, setLoadingFront] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);

  const set = (patch: Partial<KycLicense>) => onChange({ ...data, ...patch });

  const errors = {
    licenseNumber:
      touched && data.licenseNumber.trim().length < 5
        ? 'Enter a valid license number'
        : '',
    expiryDate:
      touched && data.expiryDate.trim().length < 8 ? 'Enter a valid expiry date' : '',
    frontImage: touched && !data.frontImage ? 'Front image is required' : '',
    backImage: touched && !data.backImage ? 'Back image is required' : '',
  };

  const isValid =
    data.licenseNumber.trim().length >= 5 &&
    data.expiryDate.trim().length >= 8 &&
    !!data.frontImage &&
    !!data.backImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  const handlePickFront = async () => {
    setLoadingFront(true);
    const uri = await pickImage();
    setLoadingFront(false);
    if (uri) set({ frontImage: uri });
  };

  const handlePickBack = async () => {
    setLoadingBack(true);
    const uri = await pickImage();
    setLoadingBack(false);
    if (uri) set({ backImage: uri });
  };

  return (
    <KycScreenWrapper
      step={4}
      title="Driving License"
      subtitle="We need your valid driving license to verify you are authorized to drive."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="License Number"
        required
        value={data.licenseNumber}
        onChangeText={(v) => set({ licenseNumber: v.toUpperCase() })}
        placeholder="e.g. MH0120180012345"
        autoCapitalize="characters"
        error={errors.licenseNumber}
      />

      <KycField
        label="Expiry Date"
        required
        value={data.expiryDate}
        onChangeText={(v) => set({ expiryDate: v })}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.expiryDate}
      />

      <KycUploadCard
        label="License Front"
        sublabel="Side showing your photo and license number"
        imageUri={data.frontImage}
        onPick={handlePickFront}
        loading={loadingFront}
        required
      />

      <KycUploadCard
        label="License Back"
        sublabel="Back side showing vehicle categories"
        imageUri={data.backImage}
        onPick={handlePickBack}
        loading={loadingBack}
        required
      />
    </KycScreenWrapper>
  );
}
