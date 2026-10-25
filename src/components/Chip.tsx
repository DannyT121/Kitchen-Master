import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, space } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'saffron';
}

export default function Chip({ label, selected, onPress, tone = 'default' }: Props) {
  const isSaffron = tone === 'saffron';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        isSaffron && { backgroundColor: colors.saffronSoft, borderColor: colors.saffronSoft },
        selected && { backgroundColor: colors.basil, borderColor: colors.basil },
      ]}
    >
      <Text style={[styles.text, selected && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  text: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
