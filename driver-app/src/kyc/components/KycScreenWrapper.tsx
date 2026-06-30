import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import KycProgressBar from './KycProgressBar';
import KycNavButtons from './KycNavButtons';
import { KYC_STEP_LABELS } from '../types';

interface Props {
  step: number; // 1-based, max 11
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showPrev?: boolean;
  hideNav?: boolean;
}

const TOTAL_STEPS = KYC_STEP_LABELS.length;

export default function KycScreenWrapper({
  step,
  title,
  subtitle,
  children,
  onPrev,
  onNext,
  nextLabel,
  nextDisabled,
  showPrev = true,
  hideNav = false,
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KycProgressBar
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabel={KYC_STEP_LABELS[step - 1]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>

        {!hideNav && (
          <KycNavButtons
            onPrev={onPrev}
            onNext={onNext}
            nextLabel={nextLabel}
            nextDisabled={nextDisabled}
            showPrev={showPrev}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 22, paddingBottom: 8 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkMuted, marginTop: 6, lineHeight: 20 },
});
