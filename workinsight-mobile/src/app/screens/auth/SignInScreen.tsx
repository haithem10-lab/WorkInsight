import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthService } from '../../services/authService';
import { useSessionStore } from '../../store/sessionStore';
import { CTAButton } from '../../components/CTAButton';
import { palette } from '../../theme/palette';

type Props = NativeStackScreenProps<Record<string, object | undefined>, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useSessionStore((state) => state.setUser);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await AuthService.signIn({ email: email.trim(), password });
      setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        accessToken: data.accessToken,
        photoData: data.user.photoData ?? null
      });
    } catch (error: any) {
      Alert.alert('Unable to sign in', error?.response?.status === 403 ? 'Please verify your email first.' : 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Welcome back! Access your workspace.</Text>

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
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <CTAButton label={loading ? 'Signing in...' : 'Sign in'} onPress={handleSignIn} style={styles.cta} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to WorkInsight?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.link}>Create an account</Text>
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
  link: {
    color: '#7ab5ff',
    fontWeight: '600'
  },
  cta: {
    marginTop: 8
  },
  footer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 24
  },
  footerText: {
    color: palette.text.secondary
  }
});

