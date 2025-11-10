import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CTAButton } from '../components/CTAButton';
import { LivePreviewCard } from '../components/LivePreviewCard';
import { palette } from '../theme/palette';
import { RootTabParamList } from '../navigation/types';

const trustCards = [
  {
    title: 'Universal ingestion',
    description: 'Drop PDFs, DOCX, screenshots, or URLs to capture every offer in one place.'
  },
  {
    title: 'AI field normalization',
    description: 'Detect role, location, compensation, and requirements with confidence scoring.'
  },
  {
    title: 'Verified data delivery',
    description: 'Route datasets to ATS, CRM, or BI tools with audit trails and review checkpoints.'
  }
];

const insightCards = [
  {
    title: 'PDF vacancy parsing',
    description: 'Split multi-page job packs into structured attributes without losing rich formatting.'
  },
  {
    title: 'On-site capture',
    description: 'Turn photos or screenshots from the field into shareable job briefs instantly.'
  },
  {
    title: 'Spreadsheet aggregation',
    description: 'Merge vendor trackers and staffing lists into one canonical view.'
  },
  {
    title: 'Comp insight benchmarking',
    description: 'Compare salary and benefit signals across regions to guide approvals.'
  }
];

const workflowSteps = [
  {
    title: 'Upload sources',
    description: 'Drop PDFs, DOCX files, screenshots, or URLs to gather every offer in one place.'
  },
  {
    title: 'Run extraction',
    description: 'OCR and parsers detect title, company, location, emails, and skills automatically.'
  },
  {
    title: 'Review results',
    description: 'Search, filter, and validate structured job rows inside the dashboard.'
  },
  {
    title: 'Export & share',
    description: 'Download Excel-ready datasets or hand off CSVs to stakeholders instantly.'
  }
];

const faqItems = [
  {
    question: 'Which file formats can WorkInsight process?',
    answer:
      'We support PDF, DOCX, CSV, XLSX, PNG/JPG screenshots, spreadsheets, and direct URLs. Mix formats in the same batch without extra configuration.'
  },
  {
    question: 'Can I validate extracted fields before exporting?',
    answer:
      'Yes. Every extracted job can be reviewed, edited, tagged, and approved inline before exporting to Excel or syncing to your ATS/CRM.'
  },
  {
    question: 'Do I need to write code?',
    answer:
      'No code is required. Drag-and-drop uploads, scheduled sources, and automation recipes keep your workflow visual and low effort.'
  },
  {
    question: 'Is our data secure?',
    answer:
      'Data is encrypted in transit and at rest, with audit logs and role-based access. You control retention windows and deletion policies.'
  },
  {
    question: 'What support is available?',
    answer:
      'You get in-product chat, weekly office hours, and a dedicated success partner on paid plans to help with custom playbooks.'
  }
];

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const insets = useSafeAreaInsets();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const previewAnim = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(0)).current;
  const trustAnim = useRef(new Animated.Value(0)).current;
  const workflowAnim = useRef(new Animated.Value(0)).current;
  const faqAnim = useRef(new Animated.Value(0)).current;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
    Animated.timing(previewAnim, {
      toValue: 1,
      duration: 700,
      delay: 250,
      useNativeDriver: true
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(haloAnim, { toValue: 0, duration: 1800, useNativeDriver: true })
      ])
    ).start();
    Animated.timing(trustAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }).start();
    Animated.timing(workflowAnim, { toValue: 1, duration: 700, delay: 400, useNativeDriver: true }).start();
    Animated.timing(faqAnim, { toValue: 1, duration: 700, delay: 500, useNativeDriver: true }).start();
  }, [heroAnim, previewAnim, haloAnim, trustAnim, workflowAnim, faqAnim]);

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
            styles.hero,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
                }
              ]
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroHalo,
              {
                opacity: haloAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
                transform: [
                  {
                    scale: haloAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] })
                  }
                ]
              }
            ]}
          />
          <View style={styles.badgeRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>WI</Text>
            </View>
            <Text style={styles.brand}>WorkInsight</Text>
          </View>
          <Text style={styles.heading}>
            Bring every job offer into {'\n'}
            <Text style={styles.headingAccent}>one intelligent workspace</Text>
          </Text>
          <Text style={styles.subtitle}>
            WorkInsight ingests PDFs, screenshots, spreadsheets, and career site links, then turns them into structured
            data ready for sourcing, outreach, and reporting across any workflow.
          </Text>
          <View style={styles.actions}>
            <CTAButton label="Start extracting" onPress={() => navigation.navigate('Upload')} />
            <CTAButton label="Connect my workspace" variant="secondary" onPress={() => navigation.navigate('Profile')} />
          </View>
          <Text style={styles.helper}>See supported formats - Review the end-to-end workflow below</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.previewWrapper,
            {
              opacity: previewAnim,
              transform: [
                {
                  translateY: previewAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })
                }
              ]
            }
          ]}
        >
          <LivePreviewCard />
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Why talent teams rely on WorkInsight</Text>
          <Text style={styles.sectionTitle}>Purpose-built for every extraction workflow.</Text>
          <View style={styles.cardGrid}>
            {trustCards.map((card, index) => (
              <Animated.View
                key={card.title}
                style={[
                  styles.card,
                  {
                    opacity: trustAnim,
                    transform: [
                      {
                        translateY: trustAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [24 + index * 5, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardBody}>{card.description}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.softSection]}>
          <Text style={styles.sectionBadge}>Practical examples</Text>
          <Text style={[styles.sectionTitle, styles.softTitle]}>Actionable insights across every sourcing channel.</Text>
          <View style={styles.softGrid}>
            {insightCards.map((card) => (
              <View key={card.title} style={styles.softCard}>
                <View style={styles.softIcon} />
                <Text style={styles.softCardTitle}>{card.title}</Text>
                <Text style={styles.softCardSubtitle}>{card.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionBadge}>Extraction workflow</Text>
          <Text style={styles.sectionTitle}>Extract job offers in four guided steps.</Text>
          {workflowSteps.map((step, index) => (
            <Animated.View
              key={step.title}
              style={[
                styles.workflowRow,
                {
                  opacity: workflowAnim,
                  transform: [
                    {
                      translateY: workflowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 + index * 6, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.workflowCopy}>
                <Text style={styles.cardTitle}>{step.title}</Text>
                <Text style={styles.cardBody}>{step.description}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionBadge}>CV intelligence</Text>
          <LinearGradient colors={['rgba(66,78,128,0.4)', 'rgba(52,64,112,0.4)']} style={styles.cvCard}>
            <Text style={styles.sectionTitle}>Match resumes with extracted job data.</Text>
            <Text style={[styles.cardBody, { marginBottom: 16 }]}>
              Upload a resume once and WorkInsight scores every extracted job for relevance so recruiters know where to
              focus outreach.
            </Text>
            <CTAButton label="Explore CV matches" onPress={() => navigation.navigate('Matches')} />
          </LinearGradient>
        </View>

        <Animated.View
          style={[
            styles.section,
            {
              opacity: faqAnim,
              transform: [
                {
                  translateY: faqAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] })
                }
              ]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Frequently asked questions</Text>
          <View style={styles.faqList}>
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <Pressable
                  key={item.question}
                  style={[styles.faqRow, isOpen && styles.faqRowActive]}
                  onPress={() => setOpenFaqIndex(isOpen ? null : index)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.question}</Text>
                    {isOpen && <Text style={styles.faqAnswer}>{item.answer}</Text>}
                  </View>
                  <View style={[styles.plus, isOpen && styles.plusActive]}>
                    <Text style={[styles.plusText, isOpen && styles.plusTextActive]}>{isOpen ? '−' : '+'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <View style={[styles.section, styles.footer]}>
          <View style={styles.badgeRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>WI</Text>
            </View>
            <Text style={styles.brand}>WorkInsight</Text>
          </View>
          <Text style={styles.cardBody}>
            WorkInsight transforms every internship and job offer into trusted structured data for anyone who needs it.
          </Text>
          <View style={styles.footerLinks}>
            <View>
              <Text style={styles.footerHeading}>Solutions</Text>
              {['Multi-format import', 'System connectors', 'Recruiting analytics', 'Plans & pricing'].map((item) => (
                <Text key={item} style={styles.footerLink}>
                  {item}
                </Text>
              ))}
            </View>
            <View>
              <Text style={styles.footerHeading}>Resources</Text>
              {['Help center', 'Blog', 'Customer stories', 'Schedule a demo'].map((item) => (
                <Text key={item} style={styles.footerLink}>
                  {item}
                </Text>
              ))}
            </View>
          </View>
          <Text style={styles.footerNote}>© 2025 WorkInsight Inc.</Text>
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
    gap: 32
  },
  hero: {
    gap: 16,
    backgroundColor: 'rgba(8,12,32,0.85)',
    borderRadius: 40,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative'
  },
  heroHalo: {
    position: 'absolute',
    top: -60,
    right: -40,
    height: 220,
    width: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(90,130,255,0.35)',
    opacity: 0.4
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logo: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoText: {
    color: '#9FC4FF',
    fontWeight: '700'
  },
  brand: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600'
  },
  heading: {
    fontSize: 34,
    color: '#F8FAFC',
    fontWeight: '700',
    lineHeight: 40
  },
  headingAccent: {
    color: palette.gradient.accent[0]
  },
  subtitle: {
    color: palette.text.secondary,
    fontSize: 16,
    lineHeight: 24
  },
  actions: {
    gap: 16,
    marginTop: 16
  },
  helper: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 13
  },
  previewWrapper: {
    marginTop: 8
  },
  section: {
    gap: 16
  },
  sectionLabel: {
    color: palette.text.badge,
    letterSpacing: 2,
    fontSize: 12,
    textTransform: 'uppercase'
  },
  sectionTitle: {
    color: palette.text.primary,
    fontSize: 24,
    fontWeight: '600'
  },
  cardGrid: {
    gap: 16
  },
  card: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(12,18,38,0.92)',
    borderWidth: 1,
    borderColor: palette.borders.subtle
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600'
  },
  cardBody: {
    color: palette.text.secondary,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20
  },
  softSection: {
    backgroundColor: '#f5f7ff',
    borderRadius: 36,
    padding: 24
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(140,132,255,0.2)',
    color: '#5962FF',
    fontSize: 12,
    fontWeight: '600'
  },
  softTitle: {
    color: '#0f172a'
  },
  softGrid: {
    gap: 16
  },
  softCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#c7d2fe',
    shadowOpacity: 0.35,
    shadowRadius: 20
  },
  softIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(140,132,255,0.2)',
    marginBottom: 10
  },
  softCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#141c35'
  },
  softCardSubtitle: {
    color: '#4b5563',
    marginTop: 6
  },
  workflowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16
  },
  stepBadge: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(92,134,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepBadgeText: {
    color: '#9FC4FF',
    fontWeight: '700'
  },
  workflowCopy: {
    flex: 1
  },
  cvCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(122,153,255,0.2)'
  },
  faqRow: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(6,12,30,0.85)'
  },
  faqRowActive: {
    borderColor: 'rgba(124,143,254,0.4)',
    backgroundColor: 'rgba(8,15,38,0.95)'
  },
  faqList: {
    gap: 12
  },
  plus: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(84,126,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  plusActive: {
    backgroundColor: 'rgba(124,143,254,0.25)'
  },
  plusText: {
    color: '#9FC4FF',
    fontSize: 18,
    fontWeight: '600'
  },
  plusTextActive: {
    color: '#f1f5ff'
  },
  faqAnswer: {
    color: 'rgba(226,232,240,0.75)',
    marginTop: 8,
    lineHeight: 18
  },
  footer: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    gap: 12,
    marginBottom: 80
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24
  },
  footerHeading: {
    color: '#8ec8ff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  footerLink: {
    color: palette.text.secondary,
    marginBottom: 4
  },
  footerNote: {
    color: 'rgba(148,163,184,0.6)',
    marginTop: 8
  }
});
