import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={64} color="#334155" />
      <Text style={styles.title}>Map / Route View</Text>
      <Text style={styles.subtitle}>Coming soon — requires Google Maps API key</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  subtitle: { color: '#475569', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
