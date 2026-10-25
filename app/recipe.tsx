import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Button from '../src/components/Button';
import { EmptyState } from '../src/components/StatusViews';
import { getCurrentRecipe } from '../src/store/currentRecipe';
import { findRecipeImage } from '../src/services/recipeImage';
import { addFavorite, isFavorite, removeFavorite } from '../src/storage/favorites';
import { colors, radius, space, type } from '../src/theme';
import { Recipe } from '../src/types';

function recipeAsText(r: Recipe) {
  return [
    r.title,
    `${r.timeMinutes} min | ${r.difficulty} | serves ${r.servings}`,
    '',
    'Ingredients:',
    ...r.ingredients.map((i) => `- ${i.quantity} ${i.name}`.trim()),
    '',
    'Method:',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    'Shared from Kitchen Master',
  ].join('\n');
}

export default function RecipeScreen() {
  const recipe = getCurrentRecipe();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (recipe) isFavorite(recipe.id).then(setSaved);
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.xl }}>
        <EmptyState icon="restaurant-outline" title="Recipe not found" text="Go back and pick a recipe." />
        <Button label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const toggleSave = async () => {
    if (saved) await removeFavorite(recipe.id);
    else await addFavorite(recipe);
    setSaved(!saved);
  };

  const missing = recipe.ingredients.filter((i) => i.available === false);
  const showAvailability = recipe.source === 'scan';

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <Pressable onPress={() => Share.share({ message: recipeAsText(recipe) })} accessibilityLabel="Share recipe" hitSlop={8}>
                <Ionicons name="share-outline" size={24} color={colors.basil} />
              </Pressable>
              <Pressable onPress={toggleSave} accessibilityLabel={saved ? 'Remove from saved' : 'Save recipe'} hitSlop={8}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? colors.danger : colors.basil} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
        <RecipeImage recipe={recipe} />
        <Text style={styles.cuisine}>{recipe.cuisine}</Text>
        <Text style={type.display}>{recipe.title}</Text>
        <Text style={[type.body, { color: colors.muted }]}>{recipe.description}</Text>

        <View style={styles.stats}>
          <Stat icon="time-outline" value={`${recipe.timeMinutes}`} label="minutes" />
          <Stat icon="speedometer-outline" value={recipe.difficulty} label="difficulty" />
          <Stat icon="people-outline" value={`${recipe.servings}`} label="servings" />
        </View>

        <Section title="Ingredients">
          {recipe.ingredients.map((ing, i) => {
            const have = !showAvailability || ing.available !== false;
            return (
              <View key={`${ing.name}-${i}`} style={styles.ingRow}>
                <Ionicons
                  name={have ? 'checkmark-circle' : 'add-circle-outline'}
                  size={20}
                  color={have ? colors.basil : '#B98900'}
                />
                <Text style={[type.body, { flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>{ing.quantity} </Text>
                  {ing.name}
                </Text>
              </View>
            );
          })}
          {showAvailability && missing.length > 0 && (
            <View style={styles.shopping}>
              <Text style={type.heading}>To buy</Text>
              <Text style={type.body}>{missing.map((m) => m.name).join(', ')}</Text>
            </View>
          )}
        </Section>

        <Section title="Method">
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, { flex: 1 }]}>{step}</Text>
            </View>
          ))}
        </Section>

        {recipe.tips && recipe.tips.length > 0 && (
          <Section title="Chef's tips">
            {recipe.tips.map((tip, i) => (
              <Text key={i} style={type.body}>• {tip}</Text>
            ))}
          </Section>
        )}

        <Button
          label={saved ? 'Saved' : 'Save recipe'}
          icon={saved ? 'heart' : 'heart-outline'}
          variant={saved ? 'secondary' : 'primary'}
          onPress={toggleSave}
        />
      </ScrollView>
    </>
  );
}

function RecipeImage({ recipe }: { recipe: Recipe }) {
  // undefined while looking up, null when no photo was found or it failed to load.
  const [url, setUrl] = useState<string | null | undefined>(recipe.imageUrl);

  useEffect(() => {
    if (recipe.imageUrl) return;
    let active = true;
    findRecipeImage(recipe).then((found) => {
      if (!active) return;
      // Keep it on the recipe so saving it stores the photo too.
      if (found) recipe.imageUrl = found;
      setUrl(found);
    });
    return () => {
      active = false;
    };
  }, [recipe]);

  return (
    <View>
      <View style={styles.hero}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setUrl(null)}
            accessibilityLabel={`Photo of ${recipe.imageQuery || recipe.title}`}
          />
        ) : url === undefined ? (
          <ActivityIndicator color={colors.basil} />
        ) : (
          <Ionicons name="restaurant-outline" size={48} color={colors.basil} />
        )}
      </View>
      {url ? <Text style={styles.credit}>Reference photo from Wikimedia Commons</Text> : null}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.basil} />
      <Text style={type.heading}>{value}</Text>
      <Text style={type.small}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={type.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: 56 },
  hero: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.basilSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credit: { ...type.small, fontSize: 11, marginTop: space.xs, textAlign: 'right' },
  cuisine: { fontSize: 14, fontWeight: '700', color: colors.basil },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  section: { gap: space.md },
  ingRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  shopping: {
    backgroundColor: colors.saffronSoft,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
    marginTop: space.xs,
  },
  stepRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  stepNumText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
