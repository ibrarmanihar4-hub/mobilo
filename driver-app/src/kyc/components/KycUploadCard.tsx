import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';

interface Props {
  label: string;
  sublabel?: string;
  imageUri: string | null;
  onPick: () => void;
  loading?: boolean;
  required?: boolean;
}

export default function KycUploadCard({
  label,
  sublabel,
  imageUri,
  onPick,
  loading = false,
  required = false,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}

      <TouchableOpacity
        style={[styles.card, imageUri ? styles.cardFilled : null]}
        onPress={onPick}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.inkMuted} />
        ) : imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.changeOverlay}>
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              <Text style={styles.changeText}>Change</Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-upload-outline" size={26} color={colors.inkMuted} />
            </View>
            <Text style={styles.uploadLabel}>Tap to upload</Text>
            <Text style={styles.uploadSub}>JPG, PNG up to 5 MB</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  required: { color: colors.danger },
  sublabel: {
    fontSize: 12,
    color: colors.inkFaint,
    fontWeight: '500',
    marginBottom: 8,
  },
  card: {
    height: 140,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  cardFilled: {
    borderStyle: 'solid',
    borderColor: colors.accent,
  },
  placeholder: { alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkMuted,
    marginTop: 4,
  },
  uploadSub: {
    fontSize: 11,
    color: colors.inkFaint,
    fontWeight: '500',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
});
