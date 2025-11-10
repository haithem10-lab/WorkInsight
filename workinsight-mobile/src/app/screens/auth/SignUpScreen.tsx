import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthService } from '../../services/authService';
import { CTAButton } from '../../components/CTAButton';
import { palette } from '../../theme/palette';

type Props = NativeStackScreenProps<Record<string, object | undefined>, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Missing info', 'Complete all fields to continue.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.signUp({ fullName: fullName.trim(), email: email.trim(), password });
      Alert.alert('Account created', 'Check your inbox to verify your email.');
      navigation.navigate('SignIn');
    } catch (error: any) {
      const status = error?.response?.status;
      console.error('SIGNUP_ERROR', status, error?.message);
      if (status === 409) {
        Alert.alert('Email already in use', 'Try signing in or resetting your password.');
      } else if (!status) {
        Alert.alert('Network issue', 'Cannot reach the server. Check that 192.168.0.10:8080 is accessible from your device.');
      } else {
        Alert.alert('Unable to create account', 'Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Automate your recruitment data flows in minutes.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            placeholder="Taylor Reed"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.field}>
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
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="Minimum 6 characters"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <CTAButton label={loading ? 'Creating...' : 'Create account'} onPress={handleSignUp} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 24,
    paddingTop: 80,
    gap: 16
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#f8fafc'
  },
  subtitle: {
    color: palette.text.secondary
  },
  field: {
    gap: 8
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
  },
  footer: {
    flexDirection: 'row',
    gap: 6
  },
  footerText: {
    color: palette.text.secondary
  },
  link: {
    color: '#7ab5ff',
    fontWeight: '600'
  }
});
