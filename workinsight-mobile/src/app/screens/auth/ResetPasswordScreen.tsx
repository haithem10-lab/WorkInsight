import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthService } from '../../services/authService';
import { CTAButton } from '../../components/CTAButton';
import { palette } from '../../theme/palette';

type Props = NativeStackScreenProps<Record<string, object | undefined>, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token || !password) {
      Alert.alert('Missing info', 'Enter the token and new password.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords must match.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.resetPassword(token.trim(), password);
      Alert.alert('Password updated', 'You can now sign in.');
      navigation.navigate('SignIn');
    } catch {
      Alert.alert('Unable to reset', 'The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Paste the token from your email and choose a new password.</Text>

        <Text style={styles.label}>Token</Text>
        <TextInput
          placeholder="Paste token..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={token}
          onChangeText={setToken}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
        />

        <CTAButton label={loading ? 'Updating...' : 'Update password'} onPress={handleReset} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    paddingTop: 80,
    gap: 14
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

