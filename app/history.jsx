import { View, Text, StyleSheet, FlatList } from 'react-native';

const dummyTrips = [
  { id: '1', date: '2025-09-30', status: 'Normal' },
  { id: '2', date: '2025-09-29', status: 'Idle' },
  { id: '3', date: '2025-09-28', status: 'Abnormal' },
];

export default function History() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Trips</Text>
      <FlatList
        data={dummyTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tripCard}>
            <Text style={styles.tripDate}>{item.date}</Text>
            <Text style={styles.tripStatus}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  tripCard: {
    width: '90%',
    padding: 15,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDate: { fontSize: 16, color: '#333' },
  tripStatus: { fontSize: 16, fontWeight: 'bold' },
});
