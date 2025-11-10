import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CTAButton } from '../components/CTAButton';
import { palette } from '../theme/palette';
import { ExtractionService } from '../services/extractionService';

const gradientColors = ['#0b1120', '#050b1c'] as const;

export function UploadScreen() {
  const [selectedFileLabel, setSelectedFileLabel] = useState<string | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [filePayload, setFilePayload] = useState<{ uri: string; name: string; type: string; field: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    const extension = asset.name?.split('.').pop()?.toLowerCase() ?? '';
    const field = mapField(extension);
    setFilePayload({
      uri: asset.uri,
      name: asset.name ?? 'submission',
      type: asset.mimeType ?? 'application/octet-stream',
      field
    });
    setSelectedFileLabel(asset.name ?? 'submission');
  };

  const mapField = (extension: string) => {
    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) return 'image';
    if (['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
    if (extension === 'csv') return 'csv';
    if (extension === 'json') return 'json';
    return 'document';
  };

  const handleSubmit = async () => {
    if (!filePayload && !jobUrl.trim()) {
      Alert.alert('Nothing to submit', 'Choose a file or paste a job URL.');
      return;
    }
    const form = new FormData();
    if (filePayload) {
      form.append(filePayload.field, filePayload as any);
    }
    if (jobUrl.trim()) {
      form.append('url', jobUrl.trim());
    }

    setLoading(true);
    try {
      await ExtractionService.submitExtraction(form);
      Alert.alert('Submitted', 'Your extraction has been launched.');
      setSelectedFileLabel(null);
      setFilePayload(null);
      setJobUrl('');
    } catch (error) {
      Alert.alert('Submission failed', 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, [cardAnim, glowAnim]);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
                },
                {
                  scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] })
                }
              ]
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cardGlow,
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
                transform: [
                  {
                    scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] })
                  }
                ]
              }
            ]}
          />
          <Text style={styles.title}>Submit a new offer</Text>
          <Text style={styles.subtitle}>
            Upload a PDF, image, document, spreadsheet, CSV or JSON file, or paste a job URL.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>Upload file</Text>
            <View style={styles.uploadBox}>
              <CTAButton label="Choose file" variant="secondary" onPress={handlePickFile} />
              <Text style={styles.fileName}>{selectedFileLabel ?? 'No file selected'}</Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Job URL</Text>
            <TextInput
              placeholder="https://..."
              placeholderTextColor="#94a3b8"
              value={jobUrl}
              onChangeText={setJobUrl}
              style={styles.input}
            />
          </View>
          <CTAButton label={loading ? 'Launching...' : 'Launch extraction'} onPress={handleSubmit} />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40
  },
  card: {
    borderRadius: 36,
    backgroundColor: 'rgba(10,16,34,0.95)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 16,
    overflow: 'hidden'
  },
  cardGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    height: 200,
    width: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124,143,254,0.35)'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc'
  },
  subtitle: {
    color: palette.text.secondary,
    marginBottom: 6
  },
  field: {
    gap: 8
  },
  label: {
    color: '#f1f5f9',
    fontWeight: '600'
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 12
  },
  fileName: {
    color: palette.text.secondary,
    flex: 1
  },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc'
  }
});
