'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DriverKycRow } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { X, Check, FileText, AlertTriangle } from 'lucide-react';

interface KycDrawerProps {
  kycRow: DriverKycRow | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (driverId: string) => Promise<void>;
  onReject: (driverId: string, reason: string) => Promise<void>;
  onOpenImage: (url: string) => void;
}

const DOC_FIELDS = [
  { key: 'aadhaar_front_url', label: 'Aadhaar Front' },
  { key: 'aadhaar_back_url', label: 'Aadhaar Back' },
  { key: 'pan_url', label: 'PAN Card' },
  { key: 'license_front_url', label: 'License Front' },
  { key: 'license_back_url', label: 'License Back' },
  { key: 'selfie_url', label: 'Selfie Photo' },
  { key: 'rc_front_url', label: 'RC Front' },
  { key: 'rc_back_url', label: 'RC Back' },
  { key: 'insurance_url', label: 'Insurance' },
  { key: 'puc_url', label: 'PUC Certificate' },
  { key: 'passbook_url', label: 'Bank Passbook' },
];

export default function KycDrawer({
  kycRow,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onOpenImage,
}: KycDrawerProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSignedUrls = useCallback(async () => {
    if (!kycRow) return;

    try {
      const res = await fetch(`/api/admin/kyc/${kycRow.driver_id}/documents`);
      if (!res.ok) return;
      const data = await res.json();
      setSignedUrls(data.urls || {});
    } catch {
      // ignore error
    }
  }, [kycRow]);

  useEffect(() => {
    if (isOpen && kycRow) {
      setIsRejecting(false);
      setRejectionReason('');
      fetchSignedUrls();
    } else {
      setSignedUrls({});
    }
  }, [isOpen, kycRow, fetchSignedUrls]);

  if (!isOpen || !kycRow) return null;

  const driverName = kycRow.drivers?.full_name || kycRow.full_name || 'Driver KYC';
  const driverPhone = kycRow.drivers?.phone || 'No phone';

  const handleConfirmApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(kycRow.driver_id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onReject(kycRow.driver_id, rejectionReason.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (label: string, value: string | null | undefined) => (
    <div className="space-y-0.5">
      <div className="text-[11px] font-medium text-zinc-400">{label}</div>
      <div className="text-xs font-semibold text-white break-words">
        {value || <span className="text-zinc-600 font-normal">—</span>}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#111120] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0d0d1a] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 font-extrabold flex items-center justify-center text-sm border border-indigo-500/20">
              {driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">{driverName}</div>
              <div className="text-xs text-zinc-400">
                {driverPhone} {kycRow.drivers?.ride_type ? `• ${kycRow.drivers.ride_type}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={kycRow.status} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {kycRow.rejection_reason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="font-semibold">Rejection reason:</strong>{' '}
                {kycRow.rejection_reason}
              </div>
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-white/10">
              Personal Details
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderField('Full Name', kycRow.full_name)}
              {renderField('Date of Birth', kycRow.dob)}
              {renderField('Gender', kycRow.gender)}
              {renderField('Phone Number', driverPhone)}
              {renderField('Address', kycRow.address)}
              {renderField('Emergency Contact', kycRow.emergency_contact)}
            </div>
          </div>

          {/* Section 2: Identity Documents */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-white/10">
              Identity Documents
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {renderField('Aadhaar Number', kycRow.aadhaar_number)}
              {renderField('PAN Number', kycRow.pan_number)}
              {renderField('License Number', kycRow.license_number)}
              {renderField('License Expiry', kycRow.license_expiry)}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {DOC_FIELDS.slice(0, 6).map((field) => {
                const url = signedUrls[field.key];
                return (
                  <div
                    key={field.key}
                    onClick={() => url && onOpenImage(url)}
                    className={`group rounded-lg border border-white/10 bg-[#181830] overflow-hidden transition-all ${
                      url
                        ? 'cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02]'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                      {url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt={field.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                      {field.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Vehicle Information */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-white/10">
              Vehicle & Compliance
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {renderField('Vehicle Type', kycRow.vehicle_type)}
              {renderField('Vehicle Number', kycRow.vehicle_number)}
              {renderField('Vehicle Model', kycRow.vehicle_model)}
              {renderField('Vehicle Color', kycRow.vehicle_color)}
              {renderField('RC Number', kycRow.rc_number)}
              {renderField('Insurance Number', kycRow.insurance_number)}
              {renderField('Insurance Expiry', kycRow.insurance_expiry)}
              {renderField('PUC Number', kycRow.puc_number)}
              {renderField('PUC Expiry', kycRow.puc_expiry)}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {DOC_FIELDS.slice(6).map((field) => {
                const url = signedUrls[field.key];
                return (
                  <div
                    key={field.key}
                    onClick={() => url && onOpenImage(url)}
                    className={`group rounded-lg border border-white/10 bg-[#181830] overflow-hidden transition-all ${
                      url
                        ? 'cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02]'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                      {url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt={field.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                      {field.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-white/10">
              Bank Details
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderField('Account Holder', kycRow.account_holder_name)}
              {renderField('Bank Name', kycRow.bank_name)}
              {renderField('Account Number', kycRow.account_number)}
              {renderField('IFSC Code', kycRow.ifsc_code)}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        {kycRow.status === 'pending' && (
          <div className="p-5 border-t border-white/10 bg-[#0d0d1a] sticky bottom-0 z-10">
            {isRejecting ? (
              <div className="space-y-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason for driver feedback..."
                  className="w-full p-3 rounded-xl bg-[#181830] border border-rose-500/30 text-white text-xs outline-none focus:border-rose-500 min-h-[70px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmReject}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmApprove}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Approve KYC
                </button>
                <button
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
