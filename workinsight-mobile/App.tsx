import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AppProviders } from './src/app/providers/AppProviders';
import { AppNavigator } from './src/app/navigation/AppNavigator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true })
      ]),
      Animated.timing(logoOpacity, { toValue: 0, duration: 400, delay: 400, useNativeDriver: true })
    ]).start(() => setShowSplash(false));
  }, [logoOpacity, logoScale]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style="light" />
        <AppNavigator />
        {showSplash && (
          <Animated.View style={[styles.splashOverlay, { opacity: logoOpacity }]}>
            <Animated.View style={[styles.logoBadge, { transform: [{ scale: logoScale }] }]}>
              <Text style={styles.logoText}>WI</Text>
              <Text style={styles.logoSubtitle}>WorkInsight</Text>
            </Animated.View>
          </Animated.View>
        )}
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#01040f',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100
  },
  logoBadge: {
    padding: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,12,28,0.9)',
    alignItems: 'center'
  },
  logoText: {
    color: '#f0f4ff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 4
  },
  logoSubtitle: {
    color: 'rgba(226,232,240,0.7)',
    marginTop: 6,
    fontSize: 14,
    letterSpacing: 2
  }
});
