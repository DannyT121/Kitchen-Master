import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RecipeCard from '../../src/components/RecipeCard';
import { EmptyState } from '../../src/components/StatusViews';
import { getFavorites } from '../../src/storage/favorites';
import { colors, space, type } from '../../src/theme';
import { Recipe } from '../../src/types';

export default function SavedScreen() {
  const [items, setItems] = useState<Recipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(setItems);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: space.xs, marginBottom: space.sm }}>
            <Text style={type.display}>Saved recipes</Text>
            {items.length > 0 && (
              <Text style={[type.body, { color: colors.muted }]}>
                {items.length} saved on this phone. Works offline.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Nothing saved yet"
            text="Open any recipe and tap the heart to keep it here."
          />
        }
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: 48 },
});
