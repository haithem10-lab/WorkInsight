import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CTAButton } from '../components/CTAButton';
import { palette } from '../theme/palette';
import { ExtractionService, JobRecommendation, ResumeProfile } from '../services/extractionService';
import { RootTabParamList } from '../navigation/types';

type MatchesNav = BottomTabNavigationProp<RootTabParamList>;

export function MatchesScreen() {
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<MatchesNav>();
  const insets = useSafeAreaInsets();
  const resumeAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const refreshAnim = useRef(new Animated.Value(0)).current;
  const refreshLoop = useRef<Animated.CompositeAnimation | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const [suggestions, resumeProfile] = await Promise.all([
        ExtractionService.getRecommendations(5),
        ExtractionService.getResumeProfile()
      ]);
      setRecommendations(suggestions ?? []);
      setResume(resumeProfile);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  useEffect(() => {
    Animated.timing(resumeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, [resumeAnim]);

  useEffect(() => {
    listAnim.setValue(0);
    if (recommendations.length) {
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
    }
  }, [recommendations, listAnim]);

  useEffect(() => {
    refreshLoop.current = Animated.loop(
      Animated.timing(refreshAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
  }, [refreshAnim]);

  useEffect(() => {
    if (loading) {
      refreshAnim.setValue(0);
      refreshLoop.current?.start();
    } else {
      refreshLoop.current?.stop();
      refreshAnim.setValue(0);
    }
  }, [loading, refreshAnim]);

  const resumeSkills = resume?.skills?.slice(0, 8) ?? [];

  return (
    <LinearGradient colors={palette.background.primary} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Resume matching</Text>
            <Text style={styles.subtitle}>
              Compare the skills in your resume with every extracted job. Upload a resume to refresh these insights.
            </Text>
          </View>
          <CTAButton label="Back to profile" variant="secondary" onPress={() => navigation.navigate('Profile')} />
        </View>

        <Animated.View
          style={[
            styles.resumeCard,
            {
              opacity: resumeAnim,
              transform: [
                {
                  translateY: resumeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
                }
              ]
            }
          ]}
        >
          <Text style={styles.sectionBadge}>Your resume</Text>
          <Text style={styles.resumeHeadline}>{resume?.headline ?? 'Upload your resume to start matching'}</Text>
          <Text style={styles.resumeSummary}>
            {resume?.summary ??
              'Add a resume from the profile tab so WorkInsight can highlight relevant roles for you automatically.'}
          </Text>
          {resumeSkills.length > 0 ? (
            <View style={styles.skillWrap}>
              {resumeSkills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.resumeHint}>No skills extracted yet. Upload a resume to unlock personalized tags.</Text>
          )}
          <CTAButton label="Upload resume" variant="secondary" onPress={() => navigation.navigate('Profile')} />
        </Animated.View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Matched jobs</Text>
              <Text style={styles.panelSubtitle}>Jobs ranked by similarity to your resume</Text>
            </View>
            <Pressable style={styles.refreshButton} onPress={loadMatches} disabled={loading}>
              {loading ? (
                <Animated.Text
                  style={[
                    styles.refreshIcon,
                    {
                      transform: [
                        {
                          rotate: refreshAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  {'\u21bb'}
                </Animated.Text>
              ) : (
                <Text style={styles.refreshIcon}>{'\u21bb'}</Text>
              )}
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 12 }} color="#7ab5ff" />
          ) : recommendations.length === 0 ? (
            <Text style={styles.panelBody}>
              No matches yet. Upload a resume and run a fresh extraction to see recommended jobs here.
            </Text>
          ) : (
            recommendations.map((match) => (
              <Animated.View
                key={match.jobId}
                style={[
                  styles.matchRow,
                  {
                    opacity: listAnim,
                    transform: [
                      {
                        translateY: listAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.matchHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchTitle}>{match.title ?? 'Untitled role'}</Text>
                    <Text style={styles.matchMeta}>
                      {match.company ?? 'Unknown'} · {match.location ?? 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.scoreBubble}>
                    <Text style={styles.scoreValue}>{Math.round(match.matchScore * 100)}%</Text>
                    <Text style={styles.scoreLabel}>Match</Text>
                  </View>
                </View>
                {match.summary ? <Text style={styles.matchSummary}>{match.summary}</Text> : null}
                {match.matchedSkills?.length ? (
                  <View style={styles.skillWrap}>
                    {match.matchedSkills.slice(0, 6).map((skill) => (
                      <View key={`${match.jobId}-${skill}`} style={styles.skillChip}>
                        <Text style={styles.skillChipText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <CTAButton
                  label="View in results"
                  variant="secondary"
                  onPress={() => navigation.navigate('Results')}
                  style={styles.matchCta}
                />
              </Animated.View>
            ))
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    color: palette.text.secondary,
    marginTop: 6
  },
  resumeCard: {
    borderRadius: 32,
    backgroundColor: 'rgba(9,15,33,0.95)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(124,143,254,0.18)',
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1
  },
  resumeHeadline: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600'
  },
  resumeSummary: {
    color: palette.text.secondary,
    lineHeight: 20
  },
  resumeHint: {
    color: 'rgba(148,163,184,0.8)'
  },
  skillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
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
  panel: {
    borderRadius: 32,
    backgroundColor: 'rgba(9,15,33,0.95)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600'
  },
  panelSubtitle: {
    color: palette.text.secondary
  },
  panelBody: {
    color: palette.text.secondary,
    lineHeight: 20
  },
  refreshButton: {
    height: 38,
    width: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(124,143,254,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16,24,48,0.9)'
  },
  refreshIcon: {
    color: '#a5b4fc',
    fontSize: 18,
    fontWeight: '700'
  },
  matchRow: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
    gap: 10
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  matchTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600'
  },
  matchMeta: {
    color: palette.text.secondary
  },
  matchSummary: {
    color: palette.text.secondary,
    lineHeight: 20
  },
  scoreBubble: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,143,254,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center'
  },
  scoreValue: {
    color: '#a5b4fc',
    fontWeight: '700'
  },
  scoreLabel: {
    color: 'rgba(165,180,252,0.7)',
    fontSize: 10
  },
  matchCta: {
    alignSelf: 'flex-start'
  }
});
