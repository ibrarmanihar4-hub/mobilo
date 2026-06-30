import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

interface Props {
  currentStep: number; // 1-based
  totalSteps: number;
  stepLabel: string;
}

export default function KycProgressBar({ currentStep, totalSteps, stepLabel }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pct = (currentStep - 1) / (totalSteps - 1);
    Animated.spring(progress, {
      toValue: pct,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [currentStep, totalSteps]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
        <Text style={styles.stepCount}>
          {currentStep} / {totalSteps}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolated }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  track: {
    height: 4,
    backgroundColor: colors.borderSoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
});
