import { StyleSheet, Text, View } from 'react-native';
import { useThemeMode } from '../providers/ThemeProvider';

type Props = {
  title: string;
  description?: string;
};

export function PlaceholderCard({ title, description }: Props) {
  const { theme } = useThemeMode();
  return (
    <View style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
      <Text style={[styles.badge, theme === 'dark' ? styles.badgeDark : styles.badgeLight]}>COMING SOON</Text>
      <Text style={[styles.title, theme === 'dark' ? styles.titleDark : styles.titleLight]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, theme === 'dark' ? styles.descriptionDark : styles.descriptionLight]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  cardDark: {
    backgroundColor: 'rgba(15,23,42,0.8)'
  },
  cardLight: {
    backgroundColor: '#fff'
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8
  },
  badgeDark: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    color: '#c7d2fe'
  },
  badgeLight: {
    backgroundColor: 'rgba(15,23,42,0.08)',
    color: '#1e293b'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8
  },
  titleDark: {
    color: '#e2e8f0'
  },
  titleLight: {
    color: '#0f172a'
  },
  description: {
    fontSize: 16,
    lineHeight: 22
  },
  descriptionDark: {
    color: 'rgba(226,232,240,0.8)'
  },
  descriptionLight: {
    color: '#475569'
  }
});

