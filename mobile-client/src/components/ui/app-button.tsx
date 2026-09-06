import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function AppButton({ label, onPress, icon, variant = 'primary', disabled, loading, style }: Props) {
  const palette = variant === 'primary'
    ? styles.primary
    : variant === 'danger' ? styles.danger : styles.secondary;
  const foreground = variant === 'secondary' ? Colors.primary : Colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, palette, style, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={foreground} /> : null}
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: Layout.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: Colors.danger },
  label: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});

