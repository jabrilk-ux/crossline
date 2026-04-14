import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../constants/theme';
import { signInWithEmail, supabase } from '../../services/supabase';
import { useUserStore } from '../../store/userStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setUserId, setOnboarded } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signInWithEmail(email.trim(), password);
      if (error) {
        Alert.alert('Login failed', error.message);
        return;
      }
      if (data.user) {
        setUserId(data.user.id);
        // Check if profile exists to decide routing
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          setOnboarded(true);
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(auth)/onboarding');
        }
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    // Apple Sign-In via Supabase OAuth — iOS only
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.top}>
          <Text style={styles.wordmark}>CROSSLINE</Text>
          <Text style={styles.headline}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.silver}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.silver}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.appleButtonText}> Continue with Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Crossline?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/onboarding')}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  top: {
    paddingTop: 48,
    gap: 12,
  },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
    color: colors.sky,
    letterSpacing: 6,
  },
  headline: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
  },
  form: { gap: 14 },
  input: {
    backgroundColor: colors.steel,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
  appleButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appleButtonText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.navy,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  footerLink: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.sky,
  },
});
