import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Recipe } from '../types';
import { colors, radius, space, type } from '../theme';
import { setCurrentRecipe } from '../store/currentRecipe';

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const missing = recipe.ingredients.filter((i) => i.available === false).length;

  const open = () => {
    setCurrentRecipe(recipe);
    router.push('/recipe');
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open recipe ${recipe.title}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>
      <Text style={type.small} numberOfLines={2}>{recipe.description}</Text>

      <View style={styles.meta}>
        <Meta icon="time-outline" text={`${recipe.timeMinutes} min`} />
        <Meta icon="speedometer-outline" text={recipe.difficulty} />
        <Meta icon="people-outline" text={`${recipe.servings}`} />
      </View>

      {recipe.source === 'scan' && (
        <View style={[styles.badge, missing === 0 ? styles.badgeReady : styles.badgeNeed]}>
          <Text style={styles.badgeText}>
            {missing === 0 ? 'You have everything' : `Needs ${missing} more item${missing > 1 ? 's' : ''}`}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={15} color={colors.basil} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.heading, fontSize: 17, flex: 1 },
  meta: { flexDirection: 'row', gap: space.lg, marginTop: space.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  badgeReady: { backgroundColor: colors.basilSoft },
  badgeNeed: { backgroundColor: colors.saffronSoft },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});
