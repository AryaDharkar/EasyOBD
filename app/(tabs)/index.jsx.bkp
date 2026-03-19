import { View, Text, StyleSheet } from 'react-native';

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OBD Dashboard</Text>
      <Text style={styles.subtitle}>Live data will appear here</Text>

      {/* Dashboard cards */}
      <View style={styles.cardsContainer}>
        <View style={[styles.card, { backgroundColor: '#1E40AF' }]}>
          <Text style={styles.cardTitle}>Speed</Text>
          <Text style={styles.cardValue}>0 km/h</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#2563EB' }]}>
          <Text style={styles.cardTitle}>RPM</Text>
          <Text style={styles.cardValue}>0</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#3B82F6' }]}>
          <Text style={styles.cardTitle}>Fuel</Text>
          <Text style={styles.cardValue}>50%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: 'center', backgroundColor: '#f0f4f8' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E40AF' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 20 },
  cardsContainer: { width: '90%', flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    flex: 1,
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, color: '#fff', marginBottom: 5 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
});
