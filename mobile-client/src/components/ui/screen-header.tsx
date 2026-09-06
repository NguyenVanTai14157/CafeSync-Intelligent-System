import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function ScreenHeader({ title, subtitle, back, rightIcon, rightLabel, onRightPress }: Props) {
  return (
    <View style={styles.container}>
      {back ? (
        <Pressable accessibilityLabel="Quay lại" hitSlop={10} onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightIcon && onRightPress ? (
        <Pressable accessibilityLabel={rightLabel || 'Thao tác'} hitSlop={10} onPress={onRightPress} style={styles.iconButton}>
          <Ionicons name={rightIcon} size={22} color={Colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { flex: 1 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { marginTop: 2, color: Colors.textMuted, fontSize: 12 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

