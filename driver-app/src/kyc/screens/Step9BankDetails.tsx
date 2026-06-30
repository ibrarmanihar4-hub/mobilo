import React, { useState } from 'react';
import KycScreenWrapper from '../components/KycScreenWrapper';
import KycField from '../components/KycField';
import KycUploadCard from '../components/KycUploadCard';
import { pickImage } from '../utils/pickImage';
import type { KycBankDetails } from '../types';

interface Props {
  data: KycBankDetails;
  onChange: (d: KycBankDetails) => void;
  onPrev: () => void;
  onNext: () => void;
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function Step9BankDetails({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<KycBankDetails>) => onChange({ ...data, ...patch });

  const errors = {
    accountHolderName:
      touched && !data.accountHolderName.trim() ? 'Account holder name is required' : '',
    bankName: touched && !data.bankName.trim() ? 'Bank name is required' : '',
    accountNumber:
      touched && data.accountNumber.replace(/\D/g, '').length < 9
        ? 'Enter a valid account number'
        : '',
    ifscCode:
      touched && !IFSC_REGEX.test(data.ifscCode.toUpperCase())
        ? 'Enter a valid IFSC code (e.g. SBIN0001234)'
        : '',
  };

  const isValid =
    !!data.accountHolderName.trim() &&
    !!data.bankName.trim() &&
    data.accountNumber.replace(/\D/g, '').length >= 9 &&
    IFSC_REGEX.test(data.ifscCode.toUpperCase());

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  return (
    <KycScreenWrapper
      step={9}
      title="Bank Details"
      subtitle="Your earnings will be transferred to this account. Passbook or cancelled cheque upload is optional."
      onPrev={onPrev}
      onNext={handleNext}
    >
      <KycField
        label="Account Holder Name"
        required
        value={data.accountHolderName}
        onChangeText={(v) => set({ accountHolderName: v })}
        placeholder="Name as on bank account"
        autoCapitalize="words"
        error={errors.accountHolderName}
      />

      <KycField
        label="Bank Name"
        required
        value={data.bankName}
        onChangeText={(v) => set({ bankName: v })}
        placeholder="e.g. State Bank of India"
        autoCapitalize="words"
        error={errors.bankName}
      />

      <KycField
        label="Account Number"
        required
        value={data.accountNumber}
        onChangeText={(v) => set({ accountNumber: v })}
        placeholder="Bank account number"
        keyboardType="number-pad"
        error={errors.accountNumber}
      />

      <KycField
        label="IFSC Code"
        required
        value={data.ifscCode}
        onChangeText={(v) => set({ ifscCode: v.toUpperCase() })}
        placeholder="e.g. SBIN0001234"
        autoCapitalize="characters"
        maxLength={11}
        error={errors.ifscCode}
      />

      <KycUploadCard
        label="Passbook / Cancelled Cheque"
        sublabel="Optional — helps speed up verification"
        imageUri={data.passbookImage}
        onPick={async () => {
          setLoading(true);
          const uri = await pickImage();
          setLoading(false);
          if (uri) set({ passbookImage: uri });
        }}
        loading={loading}
        required={false}
      />
    </KycScreenWrapper>
  );
}
