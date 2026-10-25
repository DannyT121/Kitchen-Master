import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../theme';

export function LoadingState({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <View style={styles.loading} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.basil} />
      <Text style={[type.body, { color: colors.muted }]}>{messages[i]}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={[type.body, { flex: 1, color: colors.danger }]}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={colors.basil} />
      <Text style={type.title}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  error: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: 56, paddingHorizontal: space.xl },
});
