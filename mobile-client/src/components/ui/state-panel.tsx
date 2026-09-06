import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Colors } from '@/constants/colors';

type Props = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({ title, message, icon = 'cafe-outline', loading, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : <Ionicons name={icon} size={42} color={Colors.coffee} />}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  message: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 8, minWidth: 160 },
});

