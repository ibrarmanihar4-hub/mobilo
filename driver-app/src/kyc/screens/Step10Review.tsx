import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';
import KycProgressBar from '../components/KycProgressBar';
import { KYC_STEP_LABELS } from '../types';
import type { KycData } from '../types';

interface Props {
  data: KycData;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export default function Step10Review({ data, onPrev, onSubmit, isSubmitting = false }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KycProgressBar
        currentStep={10}
        totalSteps={KYC_STEP_LABELS.length}
        stepLabel={KYC_STEP_LABELS[9]}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Review Your Details</Text>
        <Text style={styles.subtitle}>
          Please review all information before submitting. You can go back to make changes.
        </Text>

        {/* Profile photo */}
        {data.profilePhoto.selfieImage ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: data.profilePhoto.selfieImage }} style={styles.avatar} />
            <View>
              <Text style={styles.photoName}>{data.personal.fullName}</Text>
              <Text style={styles.photoSub}>{data.personal.gender} · {data.personal.dob}</Text>
            </View>
          </View>
        ) : null}

        <Section title="Personal Information">
          <Row label="Full Name" value={data.personal.fullName} />
          <Row label="Date of Birth" value={data.personal.dob} />
          <Row label="Gender" value={data.personal.gender} />
          <Row label="Address" value={data.personal.address} />
          <Row label="Emergency Contact" value={data.personal.emergencyContact} last />
        </Section>

        <Section title="Aadhaar">
          <Row label="Aadhaar Number" value={maskMiddle(data.aadhaar.aadhaarNumber, 4, 8)} />
          <ImageRow label="Front" uri={data.aadhaar.frontImage} />
          <ImageRow label="Back" uri={data.aadhaar.backImage} last />
        </Section>

        <Section title="PAN Card">
          <Row label="PAN Number" value={data.pan.panNumber} />
          <ImageRow label="PAN Image" uri={data.pan.panImage} last />
        </Section>

        <Section title="Driving License">
          <Row label="License Number" value={data.license.licenseNumber} />
          <Row label="Expiry" value={data.license.expiryDate} />
          <ImageRow label="Front" uri={data.license.frontImage} />
          <ImageRow label="Back" uri={data.license.backImage} last />
        </Section>

        <Section title="Vehicle">
          <Row label="Type" value={data.vehicle.vehicleType} />
          <Row label="Number" value={data.vehicle.vehicleNumber} />
          <Row label="Model" value={data.vehicle.vehicleModel} />
          <Row label="Color" value={data.vehicle.vehicleColor} />
          <Row label="RC Number" value={data.vehicle.rcNumber} />
          <ImageRow label="RC Front" uri={data.vehicle.rcFrontImage} />
          <ImageRow label="RC Back" uri={data.vehicle.rcBackImage} last />
        </Section>

        <Section title="Insurance">
          <Row label="Policy Number" value={data.insurance.insuranceNumber} />
          <Row label="Expiry" value={data.insurance.expiryDate} />
          <ImageRow label="Document" uri={data.insurance.documentImage} last />
        </Section>

        <Section title="PUC Certificate">
          <Row label="PUC Number" value={data.puc.pucNumber} />
          <Row label="Expiry" value={data.puc.expiryDate} />
          <ImageRow label="Certificate" uri={data.puc.certificateImage} last />
        </Section>

        <Section title="Bank Details">
          <Row label="Account Holder" value={data.bank.accountHolderName} />
          <Row label="Bank Name" value={data.bank.bankName} />
          <Row label="Account Number" value={maskMiddle(data.bank.accountNumber, 0, -4)} />
          <Row label="IFSC Code" value={data.bank.ifscCode} last />
        </Section>
      </ScrollView>

      {/* Nav */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.prevBtn, isSubmitting && styles.btnDisabled]}
          onPress={onPrev}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
          <Text style={styles.prevText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
          onPress={onSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.submitText}>
            {isSubmitting ? 'Uploading…' : 'Submit KYC'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
      {!last && <View style={styles.divider} />}
    </>
  );
}

function ImageRow({
  label,
  uri,
  last,
}: {
  label: string;
  uri: string | null;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.imageRow}>
        <Text style={styles.rowLabel}>{label}</Text>
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.noImage}>Not uploaded</Text>
        )}
      </View>
      {!last && <View style={styles.divider} />}
    </>
  );
}

function maskMiddle(str: string, start: number, end: number): string {
  if (!str) return '—';
  if (end < 0) {
    const visible = str.slice(end);
    return '•'.repeat(str.length + end) + visible;
  }
  const prefix = str.slice(0, start);
  const suffix = str.slice(end);
  const masked = '•'.repeat(Math.max(0, str.length - start - (str.length - end)));
  return prefix + masked + suffix;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.inkMuted, lineHeight: 20, marginBottom: 20 },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
    ...shadows.soft,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
  },
  photoName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  photoSub: { fontSize: 13, color: colors.inkMuted, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    ...shadows.soft,
  },
  row: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLabel: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.ink, flex: 2, textAlign: 'right', textTransform: 'capitalize' },
  imageRow: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  thumb: {
    width: 72,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noImage: { fontSize: 13, color: colors.inkFaint, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
  },
  prevText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
  },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
});
