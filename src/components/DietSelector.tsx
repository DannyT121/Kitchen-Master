import { ScrollView, StyleSheet } from 'react-native';
import { DIET_OPTIONS, DietFilter } from '../types';
import { space } from '../theme';
import Chip from './Chip';

interface Props {
  value: DietFilter;
  onChange: (d: DietFilter) => void;
}

export default function DietSelector({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {DIET_OPTIONS.map((o) => (
        <Chip key={o.key} label={o.label} selected={value === o.key} onPress={() => onChange(o.key)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: space.sm, paddingVertical: space.xs } });
