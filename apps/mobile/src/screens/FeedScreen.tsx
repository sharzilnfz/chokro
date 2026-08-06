import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';

const CATEGORIES = ['ALL', 'CLOTHES', 'BOOKS', 'PLASTICS', 'PAPER', 'METAL', 'GLASS', 'FURNITURE', 'APPLIANCES', 'E_WASTE'];

export function FeedScreen() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'ALL'
        ? 'http://localhost:3000/api/feed'
        : `http://localhost:3000/api/feed?category=${selectedCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [selectedCategory]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circular Marketplace</Text>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, selectedCategory === item && styles.chipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.chipText, selectedCategory === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchFeed} tintColor="#10B981" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryBadge}>{item.category}</Text>
              <Text style={styles.unitBadge}>{item.declared_weight ? `${item.declared_weight} kg` : `${item.unit}`}</Text>
            </View>
            <Text style={styles.conditionText}>Condition: {item.declared_condition}</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Request Collection / Buy</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  filterContainer: { marginBottom: 16, maxHeight: 40 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1E293B', marginRight: 8 },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#0F172A' },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },
  unitBadge: { color: '#F8FAFC', backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12 },
  conditionText: { color: '#94A3B8', fontSize: 14, marginBottom: 14 },
  actionButton: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
});
