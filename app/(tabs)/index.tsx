import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/Button';
import Chip from '../../src/components/Chip';
import DietSelector from '../../src/components/DietSelector';
import RecipeCard from '../../src/components/RecipeCard';
import { ErrorBanner, LoadingState } from '../../src/components/StatusViews';
import { analyzeFoodImage } from '../../src/services/ai';
import { colors, radius, space, type } from '../../src/theme';
import { DietFilter, ScanResult } from '../../src/types';

const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const LOADING_MESSAGES = [
  'Looking at your ingredients…',
  'Spotting veggies and spices…',
  'Thinking like a chef…',
  'Writing up recipes…',
];

interface Photo {
  uri: string;
  base64: string;
  mimeType: string;
}

export default function ScanScreen() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [diet, setDiet] = useState<DietFilter>('any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          fromCamera ? 'Camera access needed' : 'Photo access needed',
          'Allow access in your phone settings to add a picture of your ingredients.'
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.45, // keeps the upload small and fast
        base64: true,
        allowsEditing: false,
      };
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.[0]?.base64) return;

      const asset = res.assets[0];
      const mime = asset.mimeType && SUPPORTED.includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      setPhoto({ uri: asset.uri, base64: asset.base64!, mimeType: mime });
      setResult(null);
      setError(null);
    } catch {
      setError(
        fromCamera
          ? 'The camera is not available on this device. Choose a photo from your gallery instead.'
          : 'That photo could not be opened. Try a different one.'
      );
    }
  };

  const findRecipes = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyzeFoodImage(photo.base64, photo.mimeType, diet));
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={type.display}>Kitchen Master</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Photograph what you have. Get recipes you can cook with it.
        </Text>

        {/* The plate: the one bold element on the screen */}
        <Pressable
          onPress={() => (photo ? undefined : pickImage(true))}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Your ingredient photo' : 'Take a photo of your ingredients'}
          style={styles.plateWrap}
        >
          <View style={styles.plate}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.plateImage} />
            ) : (
              <View style={styles.plateEmpty}>
                <Ionicons name="camera-outline" size={52} color={colors.basil} />
                <Text style={styles.plateText}>Tap to snap your ingredients</Text>
              </View>
            )}
          </View>
          {photo && !loading && (
            <Pressable onPress={reset} style={styles.clearBtn} accessibilityLabel="Remove photo">
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </Pressable>

        <View style={styles.row}>
          <Button label="Take photo" icon="camera" onPress={() => pickImage(true)} style={{ flex: 1 }} disabled={loading} />
          <Button
            label="Gallery"
            icon="images-outline"
            variant="secondary"
            onPress={() => pickImage(false)}
            style={{ flex: 1 }}
            disabled={loading}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text style={type.heading}>Diet</Text>
          <DietSelector value={diet} onChange={setDiet} />
        </View>

        {photo && !result && (
          <Button label="Find recipes" icon="sparkles" onPress={findRecipes} loading={loading} />
        )}

        {loading && <LoadingState messages={LOADING_MESSAGES} />}
        {error && <ErrorBanner message={error} />}

        {result && !result.isFood && (
          <ErrorBanner message={result.message || 'No food found in this photo. Try a clearer picture of your ingredients.'} />
        )}

        {result?.isFood && (
          <View style={{ gap: space.lg }}>
            <View style={{ gap: space.sm }}>
              <Text style={type.title}>Found in your photo</Text>
              <View style={styles.wrap}>
                {result.detectedIngredients.map((ing) => (
                  <Chip key={ing} label={ing} tone="saffron" />
                ))}
              </View>
            </View>

            <Text style={type.title}>Recipes you can make ({result.recipes.length})</Text>
            {result.recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}

            <Button label="Scan another photo" icon="refresh" variant="secondary" onPress={reset} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const PLATE = 248;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.xl, paddingBottom: 48 },
  plateWrap: { alignSelf: 'center' },
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: PLATE / 2,
    borderWidth: 8,
    borderColor: colors.saffron,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateImage: { width: '100%', height: '100%' },
  plateEmpty: {
    width: PLATE - 44,
    height: PLATE - 44,
    borderRadius: (PLATE - 44) / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  plateText: { ...type.small, textAlign: 'center', fontWeight: '600', color: colors.basil },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
