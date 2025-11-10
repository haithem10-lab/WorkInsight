import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { palette } from '../theme/palette';

type Props = {
  label: string;
  variant?: 'primary' | 'secondary';
  onPress?: () => void;
  style?: ViewStyle;
};

export function CTAButton({ label, variant = 'primary', onPress, style }: Props) {
  if (variant === 'secondary') {
    return (
      <Pressable style={[styles.secondary, style]} onPress={onPress}>
        <Text style={styles.secondaryText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={style} onPress={onPress}>
      <LinearGradient colors={palette.gradient.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        <Text style={styles.primaryText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#58B1FF',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  primaryText: {
    color: '#f8fbff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  secondary: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: palette.borders.subtle
  },
  secondaryText: {
    color: palette.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  }
});

