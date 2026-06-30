import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycInsurance } from '../types';

interface Props {
  data: KycInsurance;
  onChange: (d: KycInsurance) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step7Insurance({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<KycInsurance>) => onChange({ ...data, ...patch });

  const errors = {
    insuranceNumber:
      touched && data.insuranceNumber.trim().length < 5
        ? 'Enter a valid insurance number'
        : '',
    expiryDate:
      touched && data.expiryDate.trim().length < 8 ? 'Enter a valid expiry date' : '',
    documentImage: touched && !data.documentImage ? 'Insurance document is required' : '',
  };

  const isValid =
    data.insuranceNumber.trim().length >= 5 &&
    data.expiryDate.trim().length >= 8 &&
    !!data.documentImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  return (
    <KycScreenWrapper
      step={7}
      title="Insurance Details"
      subtitle="Your vehicle must have valid third-party insurance to operate."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="Insurance Policy Number"
        required
        value={data.insuranceNumber}
        onChangeText={(v) => set({ insuranceNumber: v.toUpperCase() })}
        placeholder="Policy number"
        autoCapitalize="characters"
        error={errors.insuranceNumber}
      />

      <KycField
        label="Insurance Expiry Date"
        required
        value={data.expiryDate}
        onChangeText={(v) => set({ expiryDate: v })}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.expiryDate}
      />

      <KycUploadCard
        label="Insurance Document"
        sublabel="Upload insurance certificate or policy document"
        imageUri={data.documentImage}
        onPick={async () => {
          setLoading(true);
          const uri = await pickImage();
          setLoading(false);
          if (uri) set({ documentImage: uri });
        }}
        loading={loading}
        required
      />
    </KycScreenWrapper>
  );
}
