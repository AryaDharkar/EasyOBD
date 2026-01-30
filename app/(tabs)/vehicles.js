import { View, Text, StyleSheet } from 'react-native';

export default function Vehicles() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicles</Text>
      <Text style={styles.subtitle}>Vehicle management screen will go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E40AF' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 10 },
});
