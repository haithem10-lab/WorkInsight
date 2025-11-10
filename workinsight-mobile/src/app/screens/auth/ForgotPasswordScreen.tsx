import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthService } from '../../services/authService';
import { CTAButton } from '../../components/CTAButton';
import { palette } from '../../theme/palette';

type Props = NativeStackScreenProps<Record<string, object | undefined>, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Enter the email tied to your account.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.requestPasswordReset(email.trim());
      Alert.alert('Email sent', 'Check your inbox for the reset link.');
      navigation.navigate('SignIn');
    } catch {
      Alert.alert('Unable to send link', 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>Enter the email tied to your account and we will send you a reset link.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@company.com"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <CTAButton label={loading ? 'Sending...' : 'Send reset link'} onPress={handleSubmit} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    paddingTop: 80,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc'
  },
  subtitle: {
    color: palette.text.secondary
  },
  label: {
    color: '#f1f5f9',
    fontWeight: '600'
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc'
  }
});

