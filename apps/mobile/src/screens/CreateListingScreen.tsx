import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

const CATEGORIES = ['CLOTHES', 'BOOKS', 'PLASTICS', 'PAPER', 'METAL', 'GLASS', 'FURNITURE', 'APPLIANCES', 'E_WASTE'];

export function CreateListingScreen({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [category, setCategory] = useState('PLASTICS');
  const [unit, setUnit] = useState<'kg' | 'piece'>('kg');
  const [declaredWeight, setDeclaredWeight] = useState('');
  const [declaredCondition, setDeclaredCondition] = useState('GOOD');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          unit,
          declaredWeight: declaredWeight ? parseFloat(declaredWeight) : undefined,
          declaredCondition,
          photos: ['https://example.com/item.jpg'],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Listing published!');
        onCreated();
      } else {
        Alert.alert('Error', data.error || 'Could not create listing');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Listing</Text>

      <Text style={styles.label}>Select Category</Text>
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => {
              setCategory(cat);
              if (cat === 'E_WASTE' || cat === 'APPLIANCES') setUnit('piece');
            }}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Unit: {unit}</Text>

      {unit === 'kg' && (
        <TextInput
          style={styles.input}
          placeholder="Estimated Weight (kg)"
          placeholderTextColor="#64748B"
          keyboardType="numeric"
          value={declaredWeight}
          onChangeText={setDeclaredWeight}
        />
      )}

      <Text style={styles.label}>Condition</Text>
      <TextInput
        style={styles.input}
        placeholder="Condition (e.g. GOOD, FAIR, NEW)"
        placeholderTextColor="#64748B"
        value={declaredCondition}
        onChangeText={setDeclaredCondition}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Publishing...' : 'Publish Listing'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20 },
  label: { color: '#94A3B8', fontSize: 14, marginBottom: 8, marginTop: 12 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E293B' },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#0F172A' },
  input: { backgroundColor: '#1E293B', color: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});
