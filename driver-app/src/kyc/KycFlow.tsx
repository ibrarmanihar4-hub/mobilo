// KYC onboarding flow orchestrator.
// Holds all KYC state and renders the active step screen.
// No Supabase integration yet — data lives in local state only.

import React, { useState } from 'react';
import { EMPTY_KYC, type KycData } from './types';
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
  /** Called after KYC is "submitted" so the parent can continue to main app flow. */
  onComplete: () => void;
}

export default function KycFlow({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<KycData>(EMPTY_KYC);

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const patch = <K extends keyof KycData>(key: K, value: KycData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
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
          onSubmit={next}
        />
      );
    case 11:
      return <Step11Submitted onContinue={onComplete} />;
    default:
      return <Step11Submitted onContinue={onComplete} />;
  }
}
