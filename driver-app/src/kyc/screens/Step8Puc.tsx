import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycPuc } from '../types';

interface Props {
  data: KycPuc;
  onChange: (d: KycPuc) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step8Puc({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<KycPuc>) => onChange({ ...data, ...patch });

  const errors = {
    pucNumber:
      touched && data.pucNumber.trim().length < 5 ? 'Enter a valid PUC number' : '',
    expiryDate:
      touched && data.expiryDate.trim().length < 8 ? 'Enter a valid expiry date' : '',
    certificateImage: touched && !data.certificateImage ? 'PUC certificate is required' : '',
  };

  const isValid =
    data.pucNumber.trim().length >= 5 &&
    data.expiryDate.trim().length >= 8 &&
    !!data.certificateImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  return (
    <KycScreenWrapper
      step={8}
      title="PUC Certificate"
      subtitle="Pollution Under Control certificate confirms your vehicle meets emission standards."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="PUC Certificate Number"
        required
        value={data.pucNumber}
        onChangeText={(v) => set({ pucNumber: v.toUpperCase() })}
        placeholder="PUC certificate number"
        autoCapitalize="characters"
        error={errors.pucNumber}
      />

      <KycField
        label="PUC Expiry Date"
        required
        value={data.expiryDate}
        onChangeText={(v) => set({ expiryDate: v })}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.expiryDate}
      />

      <KycUploadCard
        label="PUC Certificate"
        sublabel="Upload a clear photo of your PUC certificate"
        imageUri={data.certificateImage}
        onPick={async () => {
          setLoading(true);
          const uri = await pickImage();
          setLoading(false);
          if (uri) set({ certificateImage: uri });
        }}
        loading={loading}
        required
      />
    </KycScreenWrapper>
  );
}
