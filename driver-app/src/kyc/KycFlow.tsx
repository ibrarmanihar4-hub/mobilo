// KYC onboarding flow orchestrator.
// Holds all KYC state and renders the active step screen.
// On Step 10 submit: uploads images to Storage + upserts data to driver_kyc.

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { EMPTY_KYC, type KycData } from './types';
import { submitKyc } from '../services/kycRepo';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import AadhaarScreen from './screens/AadhaarScreen';
import PanScreen from './screens/PanScreen';
import DrivingLicenseScreen from './screens/DrivingLicenseScreen';
import Step5ProfilePhoto from './screens/Step5ProfilePhoto';
import Step6Vehicle from './screens/Step6Vehicle';
import Step7Insurance from './screens/Step7Insurance';
import Step8Puc from './screens/Step8Puc';
import Step9BankDetails from './screens/Step9BankDetails';
import Step10Review from './screens/Step10Review';
import Step11Submitted from './screens/Step11Submitted';

interface Props {
  /** Called after KYC is successfully submitted so the parent can continue to main app flow. */
  onComplete: () => void;
}

export default function KycFlow({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<KycData>(EMPTY_KYC);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const patch = <K extends keyof KycData>(key: K, value: KycData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  /** Upload images + persist all fields; advance only on success. */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitKyc(data);
      if (result.success) {
        next(); // → Step 11 (Submitted)
      } else {
        Alert.alert(
          'Submission Failed',
          result.error ?? 'Something went wrong. Please try again.',
          [{ text: 'OK' }],
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err?.message ?? 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  switch (step) {
    case 1:
      return (
        <PersonalInfoScreen
          initialData={data.personal}
          onNext={(v) => { patch('personal', v); next(); }}
        />
      );
    case 2:
      return (
        <AadhaarScreen
          initialData={data.aadhaar}
          onBack={prev}
          onNext={(v) => { patch('aadhaar', v); next(); }}
        />
      );
    case 3:
      return (
        <PanScreen
          initialData={data.pan}
          onBack={prev}
          onNext={(v) => { patch('pan', v); next(); }}
        />
      );
    case 4:
      return (
        <DrivingLicenseScreen
          initialData={data.license}
          onBack={prev}
          onNext={(v) => { patch('license', v); next(); }}
        />
      );
    case 5:
      return (
        <Step5ProfilePhoto
          data={data.profilePhoto}
          onChange={(v) => patch('profilePhoto', v)}
          onPrev={prev}
          onNext={next}
        />
      );
    case 6:
      return (
        <Step6Vehicle
          data={data.vehicle}
          onChange={(v) => patch('vehicle', v)}
          onPrev={prev}
          onNext={next}
        />
      );
    case 7:
      return (
        <Step7Insurance
          data={data.insurance}
          onChange={(v) => patch('insurance', v)}
          onPrev={prev}
          onNext={next}
        />
      );
    case 8:
      return (
        <Step8Puc
          data={data.puc}
          onChange={(v) => patch('puc', v)}
          onPrev={prev}
          onNext={next}
        />
      );
    case 9:
      return (
        <Step9BankDetails
          data={data.bank}
          onChange={(v) => patch('bank', v)}
          onPrev={prev}
          onNext={next}
        />
      );
    case 10:
      return (
        <Step10Review
          data={data}
          onPrev={prev}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      );
    case 11:
      return <Step11Submitted onContinue={onComplete} />;
    default:
      return <Step11Submitted onContinue={onComplete} />;
  }
}
