import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../../theme';

interface Props {
  onPrev?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showPrev?: boolean;
}

export default function KycNavButtons({
  onPrev,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  showPrev = true,
}: Props) {
  return (
    <View style={styles.row}>
      {showPrev && onPrev ? (
        <TouchableOpacity style={styles.prevBtn} onPress={onPrev} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
          <Text style={styles.prevText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <TouchableOpacity
        style={[styles.nextBtn, nextDisabled && styles.nextDisabled]}
        onPress={onNext}
        disabled={nextDisabled}
        activeOpacity={0.85}
      >
        <Text style={styles.nextText}>{nextLabel}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  spacer: { flex: 1 },
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
  prevText: { color: colors.ink, fontSize: 15, fontWeight: '700', marginLeft: 4 },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 15,
  },
  nextDisabled: { backgroundColor: colors.inkFaint, opacity: 0.5 },
  nextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginRight: 4 },
});
