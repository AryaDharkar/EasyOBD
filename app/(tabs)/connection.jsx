import { View, Text, Button, StyleSheet } from 'react-native';

export default function Connection() {
  const handleConnect = () => {
    alert('This will scan and connect to OBD (later)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OBD Connection</Text>
      <Button title="Scan & Connect" onPress={handleConnect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});
