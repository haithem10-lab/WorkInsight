import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CTAButton } from '../components/CTAButton';
import { palette } from '../theme/palette';
import { ExtractionService, JobDashboardStats, JobOffer, ResumeProfile } from '../services/extractionService';
import { useSessionStore } from '../store/sessionStore';
import { RootTabParamList } from '../navigation/types';

type ProfileNav = BottomTabNavigationProp<RootTabParamList>;

export function ProfileScreen() {
  const [lowConfidenceAlert, setLowConfidenceAlert] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [stats, setStats] = useState<JobDashboardStats | null>(null);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [recent, setRecent] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const navigation = useNavigation<ProfileNav>();
  const insets = useSafeAreaInsets();
  const clearSession = useSessionStore((state) => state.clear);
  const currentUser = useSessionStore((state) => state.user);
  const statAnimations = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, resumeResponse, recentResponse] = await Promise.all([
        ExtractionService.getStats(),
        ExtractionService.getResumeProfile(),
        ExtractionService.getRecentJobs(3)
      ]);
      setStats(statsResponse);
      setResume(resumeResponse);
      setRecent(recentResponse ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, [heroAnim, glowAnim]);

  useEffect(() => {
    statAnimations.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      120,
      statAnimations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      )
    ).start();
  }, [stats?.totalOffers, stats?.offersThisWeek, stats?.averageConfidence, stats?.lastSevenDays, statAnimations]);

  useEffect(() => {
    panelAnim.setValue(0);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, [panelAnim, stats, resume]);

  const handleUploadResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) {
      return;
    }
    try {
      setLoading(true);
      const updated = await ExtractionService.uploadResume({
        uri: asset.uri,
        name: asset.name ?? 'resume.pdf',
        type: asset.mimeType ?? 'application/pdf'
      });
      setResume(updated);
      Alert.alert('Resume uploaded', 'Matches will update shortly.');
    } catch (error) {
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePhoto = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
    if (result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) {
      return;
    }
    try {
      setUploadingPhoto(true);
      const updated = await ExtractionService.uploadPhoto({
        uri: asset.uri,
        name: asset.name ?? 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg'
      });
      setResume(updated);
      Alert.alert('Photo updated', 'Your profile picture was refreshed.');
    } catch (error) {
      Alert.alert('Photo upload failed', 'Please try another image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    clearSession();
  };

  const statCards = [
    { label: 'Total extractions', value: stats?.totalOffers ?? 0, hint: 'All time' },
    { label: 'This week', value: stats?.offersThisWeek ?? 0, hint: 'Past 7 days' },
    {
      label: 'Average confidence',
      value: `${Math.round((stats?.averageConfidence ?? 0) * 100)}%`,
      hint: 'Across recent jobs'
    },
    {
      label: 'Last extraction',
      value: stats?.lastSevenDays?.[0]?.count ? 'Completed recently' : 'No extractions yet',
      hint: 'Keep submissions coming'
    }
  ];

  const resumeSkills = resume?.skills?.slice(0, 8) ?? [];
  const avatarFallback = currentUser?.fullName?.slice(0, 2).toUpperCase() ?? 'WI';
  const avatarData = resume?.photoData ?? currentUser?.photoData ?? null;
  const avatarUri = useMemo(() => {
    if (!avatarData) return null;
    return avatarData.startsWith('data:') ? avatarData : `data:image/png;base64,${avatarData}`;
  }, [avatarData]);

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
                }
              ]
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroGlow,
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
                transform: [
                  {
                    scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] })
                  }
                ]
              }
            ]}
          />
          <View style={styles.identityRow}>
            <View style={styles.identityLeft}>
              <View style={styles.avatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLabel}>{avatarFallback}</Text>
                )}
                <Pressable style={styles.avatarEdit} onPress={handleUpdatePhoto}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.avatarEditText}>Edit</Text>
                  )}
                </Pressable>
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.name}>{currentUser?.fullName ?? 'Guest user'}</Text>
                <Text style={styles.email}>{currentUser?.email}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Free trial</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.actionRow}>
            <CTAButton
              label="Submit extraction"
              style={styles.actionButton}
              onPress={() => navigation.navigate('Upload')}
            />
            <CTAButton
              label="View results"
              variant="secondary"
              style={styles.actionButton}
              onPress={() => navigation.navigate('Results')}
            />
            <CTAButton
              label="CV matches"
              variant="secondary"
              style={styles.actionButton}
              onPress={() => navigation.navigate('Matches')}
            />
          </View>
          <View style={styles.resumeHighlight}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>Your resume</Text>
              <Text style={styles.resumeHeadline}>
                {resume?.headline ?? 'No resume on file yet. Upload one to unlock personalised matches.'}
              </Text>
              <Text style={styles.resumeSummary}>
                {resume?.summary ??
                  'Supported formats: PDF, DOCX, DOC, TXT up to 5 MB. Upload a resume to keep recommendations fresh.'}
              </Text>
              {resumeSkills.length > 0 ? (
                <View style={styles.skillWrap}>
                  {resumeSkills.map((skill) => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <CTAButton label="Upload resume" variant="secondary" onPress={handleUploadResume} />
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator color="#7ab5ff" size="large" style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.statGrid}>
              {[0, 2].map((offset) => (
                <View key={offset} style={styles.statRow}>
                  {statCards.slice(offset, offset + 2).map((stat, index) => {
                    const animIndex = offset + index;
                    return (
                      <Animated.View
                        key={stat.label}
                        style={[
                          styles.statCard,
                          styles.statCardHalf,
                          {
                            opacity: statAnimations[animIndex],
                            transform: [
                              {
                                translateY: statAnimations[animIndex].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [16, 0]
                                })
                              },
                              {
                                scale: statAnimations[animIndex].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.94, 1]
                                })
                              }
                            ]
                          }
                        ]}
                      >
                        <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statHint}>{stat.hint}</Text>
                      </Animated.View>
                    );
                  })}
                </View>
              ))}
            </View>

            <Animated.View
              style={[
                styles.grid,
                {
                  opacity: panelAnim,
                  transform: [
                    {
                      translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Source breakdown</Text>
                <Text style={styles.panelSubtitle}>Where your jobs originate</Text>
                {stats?.sourceBreakdown && Object.keys(stats.sourceBreakdown).length ? (
                  Object.entries(stats.sourceBreakdown).map(([label, count]) => (
                    <Text key={label} style={styles.panelBody}>
                      {label}: {count}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.panelBody}>No data available yet.</Text>
                )}
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Notifications</Text>
                <Text style={styles.panelSubtitle}>Stay informed about results</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Alert me when confidence {'<'} 60%</Text>
                  <Switch value={lowConfidenceAlert} onValueChange={setLowConfidenceAlert} trackColor={{ true: '#4f46e5' }} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Send a weekly extraction digest</Text>
                  <Switch value={weeklyDigest} onValueChange={setWeeklyDigest} trackColor={{ true: '#4f46e5' }} />
                </View>
              </View>

              <View style={styles.recentCard}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={styles.panelTitle}>Recent extractions</Text>
                    <Text style={styles.panelSubtitle}>Your latest submissions</Text>
                  </View>
                  <CTAButton label="View all" variant="secondary" onPress={() => navigation.navigate('Results')} />
                </View>
                {recent.length === 0 ? (
                  <Text style={styles.panelBody}>Your latest extractions will appear here once you run them.</Text>
                ) : (
                  recent.map((offer) => (
                    <View key={offer.id} style={styles.recentRow}>
                      <Text style={styles.recentTitle}>{offer.title ?? 'Untitled role'}</Text>
                      <Text style={styles.recentMeta}>
                        {offer.company ?? 'Unknown'} · {offer.location ?? 'N/A'}
                      </Text>
                      {offer.confidenceScore != null ? (
                        <Text style={styles.recentConfidence}>
                          Confidence {(offer.confidenceScore * 100).toFixed(0)}%
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            </Animated.View>

            <CTAButton label="Logout" variant="secondary" onPress={handleLogout} style={styles.logout} />
          </>
        )}
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
    paddingBottom: 32,
    gap: 20
  },
  profileCard: {
    borderRadius: 32,
    backgroundColor: 'rgba(9,15,33,0.95)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 20,
    overflow: 'hidden'
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -30,
    height: 180,
    width: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124,143,254,0.35)'
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16
  },
  identityLeft: {
    flexDirection: 'row',
    gap: 14,
    flexShrink: 1,
    flexGrow: 1,
    alignItems: 'center'
  },
  avatar: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(124,143,254,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarEditText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700'
  },
  avatarLabel: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: 24
  },
  identityCopy: {
    flex: 1,
    gap: 4,
    minWidth: 180
  },
  name: {
    color: palette.text.primary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    flexWrap: 'wrap'
  },
  email: {
    color: palette.text.secondary
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(117,104,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: {
    color: '#a2b3ff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionButton: {
    flexGrow: 1,
    minWidth: '30%'
  },
  resumeHighlight: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(124,143,254,0.25)',
    padding: 20,
    gap: 10,
    backgroundColor: 'rgba(18,28,60,0.7)'
  },
  resumeTitle: {
    color: '#a5b4fc',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 1.2
  },
  resumeHeadline: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600'
  },
  resumeSummary: {
    color: palette.text.secondary,
    lineHeight: 20
  },
  skillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  skillChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  skillChipText: {
    color: '#dce6ff',
    fontSize: 12,
    fontWeight: '600'
  },
  statGrid: {
    gap: 12
  },
  statRow: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: 'rgba(10,17,36,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }
  },
  statCardHalf: {
    flex: 1
  },
  statLabel: {
    color: 'rgba(148,163,184,0.65)',
    fontSize: 12,
    letterSpacing: 1.2
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 6
  },
  statHint: {
    color: palette.text.secondary
  },
  grid: {
    gap: 16
  },
  panel: {
    borderRadius: 28,
    backgroundColor: 'rgba(9,15,33,0.95)',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600'
  },
  panelSubtitle: {
    color: 'rgba(148,163,184,0.8)'
  },
  panelBody: {
    color: palette.text.secondary,
    marginTop: 4,
    lineHeight: 20
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12
  },
  toggleLabel: {
    color: palette.text.secondary,
    flex: 1
  },
  recentCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(9,15,33,0.95)',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12
  },
  recentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  recentTitle: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  recentMeta: {
    color: palette.text.secondary
  },
  recentConfidence: {
    color: '#7ab5ff',
    marginTop: 4
  },
  logout: {
    borderColor: '#ff8c93',
    borderWidth: 1,
    backgroundColor: 'transparent'
  }
});
