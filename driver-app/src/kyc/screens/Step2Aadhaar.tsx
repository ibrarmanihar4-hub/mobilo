import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycAadhaar } from '../types';

interface Props {
  data: KycAadhaar;
  onChange: (d: KycAadhaar) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step2Aadhaar({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loadingFront, setLoadingFront] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);

  const set = (patch: Partial<KycAadhaar>) => onChange({ ...data, ...patch });

  const clean = data.aadhaarNumber.replace(/\D/g, '');
  const errors = {
    aadhaarNumber: touched && clean.length !== 12 ? 'Aadhaar must be 12 digits' : '',
    frontImage: touched && !data.frontImage ? 'Aadhaar front image is required' : '',
    backImage: touched && !data.backImage ? 'Aadhaar back image is required' : '',
  };

  const isValid = clean.length === 12 && !!data.frontImage && !!data.backImage;

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
      step={2}
      title="Aadhaar Verification"
      subtitle="Upload a clear photo of your Aadhaar card (both sides)."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="Aadhaar Number"
        required
        value={data.aadhaarNumber}
        onChangeText={(v) => set({ aadhaarNumber: v })}
        placeholder="XXXX XXXX XXXX"
        keyboardType="number-pad"
        maxLength={12}
        error={errors.aadhaarNumber}
      />

      <KycUploadCard
        label="Aadhaar Front"
        sublabel="Front side showing name, DOB and photo"
        imageUri={data.frontImage}
        onPick={handlePickFront}
        loading={loadingFront}
        required
      />
      {errors.frontImage ? null : null}

      <KycUploadCard
        label="Aadhaar Back"
        sublabel="Back side showing address"
        imageUri={data.backImage}
        onPick={handlePickBack}
        loading={loadingBack}
        required
      />
    </KycScreenWrapper>
  );
}
