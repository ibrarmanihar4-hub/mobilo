import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycPan } from '../types';

interface Props {
  data: KycPan;
  onChange: (d: KycPan) => void;
  onPrev: () => void;
  onNext: () => void;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export default function Step3Pan({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<KycPan>) => onChange({ ...data, ...patch });

  const panUpper = data.panNumber.toUpperCase();
  const errors = {
    panNumber: touched && !PAN_REGEX.test(panUpper) ? 'Enter a valid PAN (e.g. ABCDE1234F)' : '',
    panImage: touched && !data.panImage ? 'PAN card image is required' : '',
  };

  const isValid = PAN_REGEX.test(panUpper) && !!data.panImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  const handlePick = async () => {
    setLoading(true);
    const uri = await pickImage();
    setLoading(false);
    if (uri) set({ panImage: uri });
  };

  return (
    <KycScreenWrapper
      step={3}
      title="PAN Card Verification"
      subtitle="Your PAN is required for tax compliance and payments."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="PAN Number"
        required
        value={data.panNumber}
        onChangeText={(v) => set({ panNumber: v.toUpperCase() })}
        placeholder="ABCDE1234F"
        autoCapitalize="characters"
        maxLength={10}
        error={errors.panNumber}
      />

      <KycUploadCard
        label="PAN Card Image"
        sublabel="Upload a clear photo of your PAN card"
        imageUri={data.panImage}
        onPick={handlePick}
        loading={loading}
        required
      />
    </KycScreenWrapper>
  );
}
