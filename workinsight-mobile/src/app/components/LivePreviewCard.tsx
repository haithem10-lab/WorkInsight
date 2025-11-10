import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/palette';

export function LivePreviewCard() {
  return (
    <LinearGradient colors={['rgba(21,31,64,0.9)', 'rgba(14,22,52,0.9)']} style={styles.card}>
      <Text style={styles.title}>Live extraction preview</Text>
      <View style={styles.row}>
        <View style={styles.metaBlock}>
          <Text style={styles.label}>SOURCE</Text>
          <Text style={styles.value}>Career page</Text>
          <Text style={[styles.label, { marginTop: 16 }]}>MATCHES</Text>
          <Text style={styles.value}>182 profiles</Text>
          <Text style={[styles.label, { marginTop: 16 }]}>CONFIDENCE</Text>
          <Text style={[styles.value, styles.accent]}>0.91</Text>
        </View>
        <View style={styles.chart}>
          {[0.4, 0.6, 0.8, 0.7, 0.9].map((height, index) => (
            <View key={index} style={[styles.bar, { height: 80 * height, backgroundColor: palette.chart[index % palette.chart.length] }]} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(141,161,203,0.2)',
    width: '100%'
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaBlock: {
    flex: 1
  },
  label: {
    color: 'rgba(226,232,240,0.6)',
    fontSize: 12,
    letterSpacing: 1.2
  },
  value: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  accent: {
    color: '#5df1a1'
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  bar: {
    width: 18,
    borderRadius: 8,
    backgroundColor: '#4FC2FF'
  }
});

