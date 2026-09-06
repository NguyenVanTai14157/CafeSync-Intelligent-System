import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export const AppInput = forwardRef<TextInput, Props>(function AppInput({ label, error, style, ...props }, ref) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: 12 },
});

