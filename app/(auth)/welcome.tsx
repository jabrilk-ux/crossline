import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>CROSSLINE</Text>
          <Text style={styles.tagline}>Know the law the moment{'\n'}you cross state lines.</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(auth)/onboarding')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
    color: colors.sky,
    letterSpacing: 6,
  },
  tagline: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.9,
  },
  bottom: {
    gap: 16,
  },
  ctaButton: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
  skipText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
  },
});
