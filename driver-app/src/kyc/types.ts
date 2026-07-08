// KYC data model — local state only, no Supabase wiring yet.

export type VehicleType = 'car' | 'bike' | 'auto' | 'bus';

export interface KycPersonalInfo {
  fullName: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | '';
  address: string;
  emergencyContact: string;
}

export interface KycAadhaar {
  aadhaarNumber: string;
  frontImage: string | null;
  backImage: string | null;
}

export interface KycPan {
  panNumber: string;
  panImage: string | null;
}

export interface KycLicense {
  licenseNumber: string;
  expiryDate: string;
  frontImage: string | null;
  backImage: string | null;
}

export interface KycProfilePhoto {
  selfieImage: string | null;
}

export interface KycVehicle {
  vehicleType: VehicleType | '';
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor: string;
  rcNumber: string;
  rcFrontImage: string | null;
  rcBackImage: string | null;
}

export interface KycInsurance {
  insuranceNumber: string;
  expiryDate: string;
  documentImage: string | null;
}

export interface KycPuc {
  pucNumber: string;
  expiryDate: string;
  certificateImage: string | null;
}

export interface KycBankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  passbookImage: string | null;
}

export interface KycData {
  personal: KycPersonalInfo;
  aadhaar: KycAadhaar;
  pan: KycPan;
  license: KycLicense;
  profilePhoto: KycProfilePhoto;
  vehicle: KycVehicle;
  insurance: KycInsurance;
  puc: KycPuc;
  bank: KycBankDetails;
}

export const EMPTY_KYC: KycData = {
  personal: { fullName: '', dob: '', gender: '', address: '', emergencyContact: '' },
  aadhaar: { aadhaarNumber: '', frontImage: null, backImage: null },
  pan: { panNumber: '', panImage: null },
  license: { licenseNumber: '', expiryDate: '', frontImage: null, backImage: null },
  profilePhoto: { selfieImage: null },
  vehicle: { vehicleType: '', vehicleNumber: '', vehicleModel: '', vehicleColor: '', rcNumber: '', rcFrontImage: null, rcBackImage: null },
  insurance: { insuranceNumber: '', expiryDate: '', documentImage: null },
  puc: { pucNumber: '', expiryDate: '', certificateImage: null },
  bank: { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', passbookImage: null },
};

export const KYC_STEP_LABELS = [
  'Personal Info',
  'Aadhaar',
  'PAN Card',
  'License',
  'Profile Photo',
  'Vehicle',
  'Insurance',
  'PUC',
  'Bank Details',
  'Review',
  'Submitted',
];
