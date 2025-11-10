import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CTAButton } from '../components/CTAButton';
import { palette } from '../theme/palette';
import { ExtractionService, JobDashboardStats, JobOffer } from '../services/extractionService';
import { RootTabParamList } from '../navigation/types';

type ResultsNav = BottomTabNavigationProp<RootTabParamList>;

export function ResultsScreen() {
  const [stats, setStats] = useState<JobDashboardStats | null>(null);
  const [recent, setRecent] = useState<JobOffer[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    company: '',
    location: '',
    contactEmail: '',
    skills: '',
    status: '',
    notes: '',
    tags: '',
    rawText: ''
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const navigation = useNavigation<ResultsNav>();
  const insets = useSafeAreaInsets();
  const statAnimations = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const chartAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, recentResponse, offersResponse] = await Promise.all([
        ExtractionService.getStats(),
        ExtractionService.getRecentJobs(),
        ExtractionService.listJobs()
      ]);
      setStats(statsResponse);
      setRecent(recentResponse);
      setOffers(offersResponse);
      setSelectedOfferId((prev) => prev ?? offersResponse[0]?.id ?? null);
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
  }, [stats?.totalOffers, stats?.offersToday, stats?.offersThisWeek, stats?.averageConfidence, statAnimations]);

  useEffect(() => {
    chartAnim.setValue(0);
    if (stats) {
      Animated.timing(chartAnim, { toValue: 1, duration: 650, useNativeDriver: false }).start();
    }
  }, [stats, chartAnim]);

  const statCards = [
    { label: 'Total offers', value: stats?.totalOffers ?? 0, hint: 'Since launch' },
    { label: 'Today', value: stats?.offersToday ?? 0, hint: 'New extractions' },
    { label: 'Last 7 days', value: stats?.offersThisWeek ?? 0, hint: 'Weekly activity' },
    { label: 'Average confidence', value: `${Math.round((stats?.averageConfidence ?? 0) * 100)}%`, hint: 'Score 0 to 1' }
  ];
  const statRows = [statCards.slice(0, 2), statCards.slice(2, 4)];
  const quickTags = ['Follow-up', 'Hot lead', 'Waiting reply', 'Archived', 'To review'];
  const statusOptions = ['COMPLETED', 'IN_REVIEW', 'PENDING', 'FAILED'];

  const selectedOffer = selectedOfferId ? offers.find((offer) => offer.id === selectedOfferId) ?? null : null;

  useEffect(() => {
    if (selectedOffer) {
      setFormState({
        title: selectedOffer.title ?? '',
        company: selectedOffer.company ?? '',
        location: selectedOffer.location ?? '',
        contactEmail: selectedOffer.contactEmail ?? '',
        skills: (selectedOffer.skills ?? []).join(', '),
        status: selectedOffer.status ?? '',
        notes: selectedOffer.notes ?? '',
        tags: (selectedOffer.tags ?? []).join(', '),
        rawText: selectedOffer.rawTextSnapshot ?? ''
      });
      setFormDirty(false);
    } else {
      setFormState({
        title: '',
        company: '',
        location: '',
        contactEmail: '',
        skills: '',
        status: '',
        notes: '',
        tags: '',
        rawText: ''
      });
    }
  }, [selectedOffer]);

  const handleFieldChange = (field: keyof typeof formState, value: string) => {
    setFormDirty(true);
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickTag = (tag: string) => {
    const tags = formState.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.includes(tag)) {
      tags.push(tag);
      handleFieldChange('tags', tags.join(', '));
    }
  };

  const handleSaveOffer = async () => {
    if (!selectedOffer) {
      return;
    }
    try {
      setSavingOffer(true);
      const payload = {
        title: formState.title || null,
        company: formState.company || null,
        location: formState.location || null,
        contactEmail: formState.contactEmail || null,
        status: formState.status || null,
        notes: formState.notes || null,
        skills: formState.skills
          ? formState.skills
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean)
          : null,
        tags: formState.tags
          ? formState.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : null
      };
      const updated = await ExtractionService.updateOffer(selectedOffer.id, payload);
      setOffers((prev) => prev.map((offer) => (offer.id === updated.id ? updated : offer)));
      setRecent((prev) => prev.map((offer) => (offer.id === updated.id ? updated : offer)));
      setFormDirty(false);
      Alert.alert('Changes saved', 'This offer has been updated.');
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'Unable to update this offer right now.');
    } finally {
      setSavingOffer(false);
    }
  };

  const handleAskCopilot = async () => {
    if (!selectedOffer) {
      return;
    }
    try {
      setCopilotLoading(true);
      const suggestion = await ExtractionService.getOfferSuggestion(selectedOffer.id);
      if (!suggestion) {
        Alert.alert('No suggestions', 'The co-pilot did not return any changes.');
        return;
      }
      setFormDirty(true);
      setFormState((prev) => ({
        ...prev,
        title: suggestion.title ?? prev.title,
        company: suggestion.company ?? prev.company,
        location: suggestion.location ?? prev.location,
        contactEmail: suggestion.contactEmail ?? prev.contactEmail,
        skills: suggestion.skills?.length ? suggestion.skills.join(', ') : prev.skills
      }));
      Alert.alert('Suggestion applied', 'Review the proposed changes and save them.');
    } catch (error) {
      console.error(error);
      Alert.alert('Co-pilot unavailable', 'Unable to fetch suggestions right now.');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      await ExtractionService.exportJobs();
    } catch (error) {
      console.error(error);
      Alert.alert('Export failed', 'Unable to generate the Excel file right now. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

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
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Real-time extraction tracking.</Text>
          </View>
          <View style={styles.headerActions}>
            <CTAButton label="New extraction" variant="secondary" onPress={() => navigation.navigate('Upload')} />
            <CTAButton label="Refresh" onPress={loadData} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#7ab5ff" style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.statGrid}>
              {statRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.statRow}>
                  {row.map((stat, colIndex) => {
                    const animIndex = rowIndex * 2 + colIndex;
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
                                  outputRange: [0.95, 1]
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

            <View style={styles.panelGrid}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Activity over the last 7 days</Text>
                {stats?.lastSevenDays?.length ? (
                  <>
                    <View style={styles.sparklineContainer}>
                      {stats.lastSevenDays.map((day, idx) => {
                        const maxCount = Math.max(...stats.lastSevenDays.map((d) => d.count), 1);
                        const targetHeight = Math.max(6, (day.count / maxCount) * 80);
                        const height = chartAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [6, targetHeight]
                        });
                        return (
                          <Animated.View key={day.date + idx} style={[styles.sparkBar, { height }]}>
                            <Text style={styles.sparkCount}>{day.count}</Text>
                          </Animated.View>
                        );
                      })}
                    </View>
                    <View style={styles.sparklineLabels}>
                      {stats.lastSevenDays.map((day) => (
                        <Text key={day.date} style={styles.sparkDay}>
                          {day.date.slice(5)}
                        </Text>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.panelBody}>No data available yet.</Text>
                )}
              </View>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Source breakdown</Text>
                {stats?.sourceBreakdown && Object.keys(stats.sourceBreakdown).length ? (
                  Object.entries(stats.sourceBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([label, value]) => {
                      const maxValue = Math.max(...Object.values(stats.sourceBreakdown));
                      const width = `${Math.round((value / maxValue) * 100)}%` as const;
                      return (
                        <View key={label} style={styles.breakdownRow}>
                          <View style={styles.breakdownHeader}>
                            <Text style={styles.breakdownLabel}>{label}</Text>
                            <Text style={styles.breakdownValue}>{value}</Text>
                          </View>
                          <View style={styles.breakdownTrack}>
                            <View style={[styles.breakdownFill, { width }]} />
                          </View>
                        </View>
                      );
                    })
                ) : (
                  <Text style={styles.panelBody}>No data available yet.</Text>
                )}
              </View>
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Extracted offers</Text>
              <Text style={styles.tableSubtitle}>Details of recent records</Text>
              <View style={styles.searchRow}>
                <TextInput
                  placeholder="Search for a job, company or skill..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
                <CTAButton
                  label={exporting ? 'Exporting...' : 'Export to Excel'}
                  variant="secondary"
                  onPress={exporting ? undefined : handleExport}
                />
              </View>
              {recent.length === 0 ? (
                <Text style={styles.panelBody}>No offers available yet.</Text>
              ) : (
                recent.map((offer) => (
                  <View key={offer.id} style={styles.offerRow}>
                    <Text style={styles.offerTitle}>{offer.title ?? 'Untitled role'}</Text>
                    <Text style={styles.offerMeta}>
                      {offer.company ?? 'Unknown'} · {offer.location ?? 'N/A'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {offers.length > 0 && (
              <View style={styles.editorSection}>
                <Text style={styles.tableTitle}>Offer details</Text>
                <Text style={styles.tableSubtitle}>Tap an offer to review, edit, and run the co-pilot.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.offerList}>
                  {offers.map((offer) => {
                    const isActive = offer.id === selectedOfferId;
                    return (
                      <Pressable
                        key={offer.id}
                        style={[styles.offerListItem, isActive && styles.offerListItemActive]}
                        onPress={() => setSelectedOfferId(offer.id)}
                      >
                        <Text style={styles.offerListTitle}>{offer.title ?? 'Untitled role'}</Text>
                        <Text style={styles.offerListMeta}>
                          {offer.company ?? 'Unknown'} · {offer.location ?? 'N/A'}
                        </Text>
                        {offer.status ? <Text style={styles.offerListStatus}>{offer.status}</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {selectedOffer ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Offer details</Text>
                    <Text style={styles.detailSubtitle}>Review, tag and polish this extraction inline.</Text>

                    <View style={styles.formRow}>
                      <View style={styles.formColumn}>
                        <Text style={styles.inputLabel}>Role</Text>
                        <TextInput
                          value={formState.title}
                          onChangeText={(value) => handleFieldChange('title', value)}
                          style={styles.input}
                          placeholder="Role name"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={styles.formColumn}>
                        <Text style={styles.inputLabel}>Company</Text>
                        <TextInput
                          value={formState.company}
                          onChangeText={(value) => handleFieldChange('company', value)}
                          style={styles.input}
                          placeholder="Company"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formColumn}>
                        <Text style={styles.inputLabel}>Location</Text>
                        <TextInput
                          value={formState.location}
                          onChangeText={(value) => handleFieldChange('location', value)}
                          style={styles.input}
                          placeholder="City, Country"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={styles.formColumn}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                          value={formState.contactEmail}
                          onChangeText={(value) => handleFieldChange('contactEmail', value)}
                          style={styles.input}
                          placeholder="email@example.com"
                          placeholderTextColor="#94a3b8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Skills (comma separated)</Text>
                    <TextInput
                      value={formState.skills}
                      onChangeText={(value) => handleFieldChange('skills', value)}
                      style={[styles.input, styles.inputMultiline]}
                      placeholder="React, Spring Boot, ..."
                      placeholderTextColor="#94a3b8"
                      multiline
                    />

                    <Text style={styles.inputLabel}>Status</Text>
                    <View style={styles.statusRow}>
                      {statusOptions.map((status) => {
                        const isActive = formState.status === status;
                        return (
                          <Pressable
                            key={status}
                            style={[styles.statusChip, isActive && styles.statusChipActive]}
                            onPress={() => handleFieldChange('status', status)}
                          >
                            <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>{status}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      value={formState.notes}
                      onChangeText={(value) => handleFieldChange('notes', value)}
                      style={[styles.input, styles.inputMultiline]}
                      placeholder="Add reviewer notes..."
                      placeholderTextColor="#94a3b8"
                      multiline
                    />

                    <Text style={styles.inputLabel}>Tags (comma separated)</Text>
                    <TextInput
                      value={formState.tags}
                      onChangeText={(value) => handleFieldChange('tags', value)}
                      style={styles.input}
                      placeholder="Type and press Enter..."
                      placeholderTextColor="#94a3b8"
                    />
                    <View style={styles.quickTagsRow}>
                      {quickTags.map((tag) => (
                        <Pressable key={tag} style={styles.quickTag} onPress={() => handleQuickTag(tag)}>
                          <Text style={styles.quickTagText}>{tag}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.formActions}>
                      <CTAButton
                        label={copilotLoading ? 'Analyzing...' : 'Ask the co-pilot'}
                        variant="secondary"
                        onPress={copilotLoading ? undefined : handleAskCopilot}
                      />
                      <CTAButton
                        label={savingOffer ? 'Saving...' : 'Save'}
                        onPress={formDirty && !savingOffer ? handleSaveOffer : undefined}
                        style={!formDirty ? styles.disabledButton : undefined}
                      />
                    </View>

                    <Text style={styles.inputLabel}>Captured text</Text>
                    <View style={styles.rawTextContainer}>
                      <ScrollView>
                        <Text style={styles.rawTextContent}>
                          {formState.rawText ? formState.rawText : 'No captured text available'}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>
                ) : null}
              </View>
            )}
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
    gap: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  headerActions: {
    flexDirection: 'row',
    gap: 12
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
    backgroundColor: 'rgba(9,15,33,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  statCardHalf: {
    flex: 1
  },
  statLabel: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 12,
    letterSpacing: 1.2
  },
  statValue: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 8
  },
  statHint: {
    color: palette.text.secondary
  },
  panelGrid: {
    gap: 16
  },
  panel: {
    borderRadius: 28,
    backgroundColor: 'rgba(8,13,30,0.95)',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600'
  },
  panelBody: {
    color: palette.text.secondary
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 100,
    marginTop: 8
  },
  sparkBar: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(117,148,255,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4
  },
  sparkCount: {
    color: '#e2e8ff',
    fontSize: 10,
    fontWeight: '600'
  },
  sparklineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sparkDay: {
    color: 'rgba(148,163,184,0.8)',
    fontSize: 10
  },
  breakdownRow: {
    gap: 6
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  breakdownLabel: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  breakdownValue: {
    color: '#9fc4ff',
    fontWeight: '600'
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(117,148,255,0.55)'
  },
  tableCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(8,13,30,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12
  },
  tableTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600'
  },
  tableSubtitle: {
    color: palette.text.secondary
  },
  editorSection: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    backgroundColor: 'rgba(8,13,30,0.95)',
    gap: 16
  },
  offerList: {
    marginHorizontal: -4
  },
  offerListItem: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginRight: 12,
    width: 220,
    backgroundColor: 'rgba(10,15,32,0.7)'
  },
  offerListItemActive: {
    borderColor: '#7ab5ff',
    backgroundColor: 'rgba(122,181,255,0.12)'
  },
  offerListTitle: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  offerListMeta: {
    color: palette.text.secondary,
    marginTop: 4
  },
  offerListStatus: {
    marginTop: 8,
    color: '#7ab5ff',
    fontSize: 12,
    fontWeight: '600'
  },
  detailCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    backgroundColor: 'rgba(6,10,24,0.9)',
    gap: 14
  },
  detailTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600'
  },
  detailSubtitle: {
    color: palette.text.secondary
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc'
  },
  offerRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  offerTitle: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  offerMeta: {
    color: palette.text.secondary
  },
  formRow: {
    flexDirection: 'row',
    gap: 12
  },
  formColumn: {
    flex: 1
  },
  inputLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    backgroundColor: 'rgba(1,3,12,0.6)',
    marginBottom: 10
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  statusChipActive: {
    borderColor: '#7ab5ff',
    backgroundColor: 'rgba(122,181,255,0.15)'
  },
  statusChipText: {
    color: 'rgba(226,232,240,0.7)',
    fontSize: 12,
    fontWeight: '600'
  },
  statusChipTextActive: {
    color: '#f8fafc'
  },
  quickTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6
  },
  quickTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  quickTagText: {
    color: '#c1c9f5',
    fontSize: 12,
    fontWeight: '600'
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  rawTextContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(1,3,12,0.6)',
    maxHeight: 160,
    padding: 12
  },
  rawTextContent: {
    color: 'rgba(226,232,240,0.85)',
    lineHeight: 18
  },
  disabledButton: {
    opacity: 0.5
  }
});
