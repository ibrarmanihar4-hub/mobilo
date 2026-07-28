// kycRepo.ts — Supabase persistence layer for Driver KYC.
//
// Two responsibilities:
//   1. Upload document images to the "driver-kyc" Storage bucket.
//   2. Upsert all KYC fields + image URLs into the driver_kyc table.

import { getSupabase, isSupabaseConfigured } from './supabase';
import type { KycData } from '../kyc/types';
import type { DriverKycRow, KycStatus } from '../types';

const BUCKET = 'driver-kyc';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Upload a base64 data URI image to Supabase Storage.
 * Returns the storage path (relative URL within the bucket) on success,
 * or null if the image is missing / upload fails.
 *
 * @param uid      - The authenticated driver's user ID (used as folder prefix).
 * @param filename - A stable name like "aadhaar_front.jpg".
 * @param dataUri  - A base64 data URI e.g. "data:image/jpeg;base64,/9j/4AA..."
 */
async function uploadImage(
  uid: string,
  filename: string,
  dataUri: string | null,
): Promise<string | null> {
  if (!dataUri) return null;

  const client = getSupabase();
  const storagePath = `${uid}/${filename}`;

  // Strip the "data:<mime>;base64," header and decode.
  const [header, base64Data] = dataUri.split(',');
  if (!base64Data) return null;
  const mimeMatch = header.match(/data:(.*);base64/);
  const contentType = mimeMatch?.[1] ?? 'image/jpeg';

  // Decode base64 → binary array
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true, // overwrite on re-submission
    });

  if (error) {
    console.warn(`uploadImage [${filename}] failed:`, error.message);
    return null;
  }

  return storagePath;
}

/**
 * Returns a signed URL (valid for 1 year) for a storage path, or null.
 * Used after upload so the URL can be displayed in the app and stored in DB.
 */
async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const client = getSupabase();
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
  if (error || !data?.signedUrl) {
    console.warn('getSignedUrl failed:', error?.message);
    return null;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface KycSubmitResult {
  success: boolean;
  error?: string;
}

/**
 * Upload all KYC document images and upsert the full KYC record into
 * the driver_kyc table. Sets status = 'pending' and submitted_at = now().
 *
 * Safe to call multiple times — uses upsert so re-submissions overwrite
 * the previous record (e.g. after a rejection).
 */
export async function submitKyc(data: KycData): Promise<KycSubmitResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const uid = user.id;

  // -------------------------------------------------------------------------
  // 1. Upload all images in parallel.
  // -------------------------------------------------------------------------
  const [
    aadhaarFrontPath,
    aadhaarBackPath,
    panPath,
    licenseFrontPath,
    licenseBackPath,
    selfiePath,
    rcFrontPath,
    rcBackPath,
    insurancePath,
    pucPath,
    passbookPath,
  ] = await Promise.all([
    uploadImage(uid, 'aadhaar_front.jpg',   data.aadhaar.frontImage),
    uploadImage(uid, 'aadhaar_back.jpg',    data.aadhaar.backImage),
    uploadImage(uid, 'pan.jpg',             data.pan.panImage),
    uploadImage(uid, 'license_front.jpg',   data.license.frontImage),
    uploadImage(uid, 'license_back.jpg',    data.license.backImage),
    uploadImage(uid, 'selfie.jpg',          data.profilePhoto.selfieImage),
    uploadImage(uid, 'rc_front.jpg',        data.vehicle.rcFrontImage),
    uploadImage(uid, 'rc_back.jpg',         data.vehicle.rcBackImage),
    uploadImage(uid, 'insurance.jpg',       data.insurance.documentImage),
    uploadImage(uid, 'puc.jpg',             data.puc.certificateImage),
    uploadImage(uid, 'passbook.jpg',        data.bank.passbookImage),
  ]);

  // -------------------------------------------------------------------------
  // 2. Generate signed URLs for all uploaded paths.
  // -------------------------------------------------------------------------
  const [
    aadhaarFrontUrl,
    aadhaarBackUrl,
    panUrl,
    licenseFrontUrl,
    licenseBackUrl,
    selfieUrl,
    rcFrontUrl,
    rcBackUrl,
    insuranceUrl,
    pucUrl,
    passbookUrl,
  ] = await Promise.all([
    getSignedUrl(aadhaarFrontPath),
    getSignedUrl(aadhaarBackPath),
    getSignedUrl(panPath),
    getSignedUrl(licenseFrontPath),
    getSignedUrl(licenseBackPath),
    getSignedUrl(selfiePath),
    getSignedUrl(rcFrontPath),
    getSignedUrl(rcBackPath),
    getSignedUrl(insurancePath),
    getSignedUrl(pucPath),
    getSignedUrl(passbookPath),
  ]);

  // -------------------------------------------------------------------------
  // 3. Upsert all KYC fields into driver_kyc.
  // -------------------------------------------------------------------------
  const { error: upsertError } = await client.from('driver_kyc').upsert(
    {
      driver_id: uid,
      status: 'pending' as KycStatus,
      submitted_at: new Date().toISOString(),

      // personal
      full_name:          data.personal.fullName       || null,
      dob:                data.personal.dob            || null,
      gender:             data.personal.gender         || null,
      address:            data.personal.address        || null,
      emergency_contact:  data.personal.emergencyContact || null,

      // aadhaar
      aadhaar_number:     data.aadhaar.aadhaarNumber   || null,
      aadhaar_front_url:  aadhaarFrontUrl,
      aadhaar_back_url:   aadhaarBackUrl,

      // pan
      pan_number:         data.pan.panNumber           || null,
      pan_url:            panUrl,

      // license
      license_number:     data.license.licenseNumber   || null,
      license_expiry:     data.license.expiryDate      || null,
      license_front_url:  licenseFrontUrl,
      license_back_url:   licenseBackUrl,

      // profile photo
      selfie_url:         selfieUrl,

      // vehicle
      vehicle_type:       data.vehicle.vehicleType     || null,
      vehicle_number:     data.vehicle.vehicleNumber   || null,
      vehicle_model:      data.vehicle.vehicleModel    || null,
      vehicle_color:      data.vehicle.vehicleColor    || null,
      rc_number:          data.vehicle.rcNumber        || null,
      rc_front_url:       rcFrontUrl,
      rc_back_url:        rcBackUrl,

      // insurance
      insurance_number:   data.insurance.insuranceNumber || null,
      insurance_expiry:   data.insurance.expiryDate    || null,
      insurance_url:      insuranceUrl,

      // puc
      puc_number:         data.puc.pucNumber           || null,
      puc_expiry:         data.puc.expiryDate          || null,
      puc_url:            pucUrl,

      // bank
      account_holder_name: data.bank.accountHolderName || null,
      bank_name:           data.bank.bankName          || null,
      account_number:      data.bank.accountNumber     || null,
      ifsc_code:           data.bank.ifscCode          || null,
      passbook_url:        passbookUrl,
    },
    { onConflict: 'driver_id' },
  );

  if (upsertError) {
    console.warn('submitKyc upsert failed:', upsertError.message);
    return { success: false, error: upsertError.message };
  }

  return { success: true };
}

/**
 * Fetch the current KYC record for the logged-in driver.
 * Returns null if not yet submitted or not authenticated.
 */
export async function fetchKycRecord(): Promise<DriverKycRow | null> {
  if (!isSupabaseConfigured) return null;

  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from('driver_kyc')
    .select('*')
    .eq('driver_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('fetchKycRecord failed:', error.message);
    return null;
  }

  return (data as DriverKycRow) ?? null;
}
