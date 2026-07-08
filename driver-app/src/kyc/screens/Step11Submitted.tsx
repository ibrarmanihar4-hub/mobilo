import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';

interface Props {
  onContinue: () => void;
}

export default function Step11Submitted({ onContinue }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 6,
        delay: 100,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Animated checkmark */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
          <Text style={styles.title}>KYC Submitted Successfully!</Text>
          <Text style={styles.subtitle}>
            Your documents are under verification. You will be able to go online after approval.
          </Text>

          {/* Status steps */}
          <View style={styles.stepsCard}>
            <StatusStep
              icon="checkmark-circle"
              iconColor={colors.accent}
              title="Documents Submitted"
              subtitle="All documents received"
              done
            />
            <View style={styles.stepDivider} />
            <StatusStep
              icon="hourglass-outline"
              iconColor={colors.warning}
              title="Under Verification"
              subtitle="Our team is reviewing your documents"
              active
            />
            <View style={styles.stepDivider} />
            <StatusStep
              icon="shield-checkmark-outline"
              iconColor={colors.inkFaint}
              title="Approved"
              subtitle="You'll receive a notification"
            />
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={colors.warning} />
            <Text style={styles.infoText}>
              Verification typically takes 24-48 hours. You'll receive an SMS and notification once approved.
            </Text>
          </View>

          <TouchableOpacity style={styles.ctaBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function StatusStep({
  icon,
  iconColor,
  title,
  subtitle,
  done,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <View style={styles.stepText}>
        <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>{title}</Text>
        <Text style={styles.stepSub}>{subtitle}</Text>
      </View>
      {done && (
        <View style={styles.donePill}>
          <Text style={styles.donePillText}>Done</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  iconWrap: { marginBottom: 28 },
  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  iconInner: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: '500',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...shadows.soft,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  stepDivider: { height: 1, backgroundColor: colors.borderSoft, marginLeft: 34 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.inkMuted },
  stepTitleActive: { color: colors.ink },
  stepSub: { fontSize: 12, color: colors.inkFaint, fontWeight: '500', marginTop: 2 },
  donePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  donePillText: { fontSize: 11, fontWeight: '800', color: colors.accent },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 28,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    lineHeight: 19,
  },
  ctaBtn: {
    width: '100%',
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
