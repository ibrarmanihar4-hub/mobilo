import React, { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';
import KycScreenWrapper from '../components/KycScreenWrapper';
import { pickImage, takeSelfie } from '../utils/pickImage';
import type { KycProfilePhoto } from '../types';

interface Props {
  data: KycProfilePhoto;
  onChange: (d: KycProfilePhoto) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step5ProfilePhoto({ data, onChange, onPrev, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = !!data.selfieImage;

  const handleNext = () => {
    setTouched(true);
    if (isValid) onNext();
  };

  const handleCamera = async () => {
    setLoading(true);
    const uri = await takeSelfie();
    setLoading(false);
    if (uri) onChange({ selfieImage: uri });
  };

  const handleGallery = async () => {
    setLoading(true);
    const uri = await pickImage();
    setLoading(false);
    if (uri) onChange({ selfieImage: uri });
  };

  return (
    <KycScreenWrapper
      step={5}
      title="Profile Photo"
      subtitle="Upload a clear selfie. Make sure your face is fully visible and well-lit."
      onPrev={onPrev}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      {/* Large profile preview */}
      <View style={styles.previewContainer}>
        {data.selfieImage ? (
          <Image source={{ uri: data.selfieImage }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="person" size={52} color={colors.inkFaint} />
            <Text style={styles.placeholderText}>No photo yet</Text>
          </View>
        )}
      </View>

      {touched && !data.selfieImage ? (
        <Text style={styles.errorText}>Profile photo is required</Text>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCamera}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="camera" size={22} color={colors.ink} />
          </View>
          <Text style={styles.actionLabel}>Take Selfie</Text>
          <Text style={styles.actionSub}>Use camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleGallery}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="images" size={22} color={colors.ink} />
          </View>
          <Text style={styles.actionLabel}>Choose Photo</Text>
          <Text style={styles.actionSub}>From gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>Tips for a good photo</Text>
        {['Face fully visible and centred', 'Good lighting, no shadows', 'No sunglasses or hat', 'Plain background preferred'].map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </KycScreenWrapper>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    width: 160,
    height: 160,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.border,
    ...shadows.floating,
  },
  preview: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: colors.inkFaint, fontSize: 13, fontWeight: '600', marginTop: 8 },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    ...shadows.soft,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  actionSub: { fontSize: 11, color: colors.inkFaint, fontWeight: '500' },
  tipsBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText: { fontSize: 13, color: colors.inkMuted, fontWeight: '500' },
});
