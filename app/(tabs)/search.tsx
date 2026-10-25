import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../../src/components/Chip';
import DietSelector from '../../src/components/DietSelector';
import RecipeCard from '../../src/components/RecipeCard';
import { ErrorBanner, LoadingState } from '../../src/components/StatusViews';
import { searchRecipes } from '../../src/services/ai';
import { colors, radius, space, type } from '../../src/theme';
import { DietFilter, SearchResult } from '../../src/types';

const SUGGESTIONS = [
  'Quick paneer dinner',
  'Healthy breakfast with oats',
  'One-pot chicken curry',
  'Vegan chocolate dessert',
  'Leftover rice ideas',
  'Kid-friendly pasta',
];
const LOADING_MESSAGES = ['Searching the cookbook…', 'Picking the best matches…', 'Writing up recipes…'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<DietFilter>('any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const run = async (q: string = query) => {
    const text = q.trim();
    if (!text) return;
    Keyboard.dismiss();
    setQuery(text);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchRecipes(text, diet));
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={type.display}>Recipe search</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Ask for a dish, an ingredient or a craving. Recipes only.
        </Text>

        <View style={styles.inputRow}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => run()}
            placeholder="e.g. spicy potato snack"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            maxLength={200}
            style={styles.input}
            accessibilityLabel="Search recipes"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => run()}
            style={[styles.go, !query.trim() && { opacity: 0.5 }]}
            disabled={!query.trim() || loading}
            accessibilityLabel="Search"
          >
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <DietSelector value={diet} onChange={setDiet} />

        {!result && !loading && (
          <View style={{ gap: space.sm }}>
            <Text style={type.heading}>Try one of these</Text>
            <View style={styles.wrap}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => run(s)} />
              ))}
            </View>
          </View>
        )}

        {loading && <LoadingState messages={LOADING_MESSAGES} />}
        {error && <ErrorBanner message={error} />}

        {result && !result.onTopic && (
          <View style={styles.notice}>
            <Ionicons name="restaurant-outline" size={22} color={colors.basil} />
            <Text style={[type.body, { flex: 1 }]}>
              {result.message || 'Kitchen Master only answers recipe and cooking questions. Try asking for a dish.'}
            </Text>
          </View>
        )}

        {result?.onTopic && (
          <View style={{ gap: space.lg }}>
            <Text style={type.title}>
              {result.recipes.length} recipe{result.recipes.length === 1 ? '' : 's'} for “{query}”
            </Text>
            {result.recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.lg, paddingBottom: 48 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingLeft: space.md,
    paddingRight: 6,
    minHeight: 54,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: space.md },
  go: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notice: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.basilSoft,
    padding: space.lg,
    borderRadius: radius.md,
  },
});
