import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>Circular Feed</Text>
        <Text style={styles.subtitle}>Reusable items & recyclable materials near you</Text>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 20 }}
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

      {/* Feed List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchFeed} tintColor="#10B981" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <Text style={styles.categoryBadge}>{item.category}</Text>
                <Text style={styles.conditionBadge}>{item.declared_condition}</Text>
              </View>
              <Text style={styles.unitBadge}>{item.declared_weight ? `${item.declared_weight} kg` : `${item.unit}`}</Text>
            </View>

            <Text style={styles.pathRecommendation}>💡 Recommended Path: Reuse / Recycle</Text>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Request Pickup / Buy</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  headerArea: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  filterContainer: { marginBottom: 16, maxHeight: 38 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#131C2E', marginRight: 8, borderWidth: 1, borderColor: '#1E293B' },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#090D16', fontWeight: '700' },
  card: { backgroundColor: '#131C2E', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryBadge: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },
  conditionBadge: { color: '#94A3B8', backgroundColor: '#090D16', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11 },
  unitBadge: { color: '#F8FAFC', backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '700' },
  pathRecommendation: { color: '#38BDF8', fontSize: 13, marginBottom: 16, fontWeight: '500' },
  actionButton: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#090D16', fontWeight: 'bold', fontSize: 14 },
});
