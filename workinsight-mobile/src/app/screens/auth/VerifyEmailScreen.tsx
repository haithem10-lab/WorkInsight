import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthService } from '../../services/authService';
import { CTAButton } from '../../components/CTAButton';
import { palette } from '../../theme/palette';

type Props = NativeStackScreenProps<Record<string, object | undefined>, 'VerifyEmail'>;

export function VerifyEmailScreen({ navigation }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!token) {
      Alert.alert('Missing token', 'Paste the token from your email.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.verify(token.trim());
      Alert.alert('Email verified', 'You can now sign in.');
      navigation.navigate('SignIn');
    } catch {
      Alert.alert('Unable to verify', 'The token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Verify email</Text>
        <Text style={styles.subtitle}>Paste the verification token we sent to your inbox.</Text>
        <TextInput
          placeholder="Verification token"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={token}
          onChangeText={setToken}
        />
        <CTAButton label={loading ? 'Verifying...' : 'Verify'} onPress={handleVerify} />
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
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc'
  }
});

