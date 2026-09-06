import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage } from '@/services/api';
import { authService } from '@/services/auth-service';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || (mode === 'register' && !name.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
        router.back();
      } else {
        const message = await register({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim(), password });
        Alert.alert('Đăng ký thành công', message, [{ text: 'Đăng nhập', onPress: () => setMode('login') }]);
        setPassword('');
      }
    } catch (error) {
      Alert.alert(mode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Nhập email', 'Nhập email tài khoản trước khi yêu cầu khôi phục.');
      return;
    }
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email.trim());
      Alert.alert('Đã gửi email', result.message);
    } catch (error) {
      Alert.alert('Không thể gửi email', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <ScreenHeader title="Thành viên CaféSync" back />
          <View style={styles.brandPanel}>
            <View style={styles.brandIcon}><Ionicons name="cafe" size={28} color={Colors.surface} /></View>
            <View style={styles.brandCopy}><Text style={styles.brandTitle}>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</Text><Text style={styles.brandText}>Đồng bộ lịch sử và nhận gợi ý theo khẩu vị.</Text></View>
          </View>

          <View style={styles.segmented}>
            <Pressable onPress={() => setMode('login')} style={[styles.segment, mode === 'login' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Đăng nhập</Text></Pressable>
            <Pressable onPress={() => setMode('register')} style={[styles.segment, mode === 'register' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Đăng ký</Text></Pressable>
          </View>

          <View style={styles.form}>
            {mode === 'register' ? <AppInput label="Họ và tên *" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" /> : null}
            {mode === 'register' ? <AppInput label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="next" /> : null}
            <AppInput label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
            <AppInput label="Mật khẩu *" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={() => void submit()} />
            {mode === 'login' ? <Pressable disabled={loading} onPress={() => void forgotPassword()} style={styles.forgot}><Text style={styles.forgotText}>Quên mật khẩu?</Text></Pressable> : null}
            <AppButton label={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'} loading={loading} onPress={() => void submit()} />
          </View>
          <Text style={styles.note}>Đăng nhập Google/Facebook của website chưa dùng trên mobile vì backend hiện chuyển hướng về URL web.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: Layout.screenPadding, paddingBottom: 30, gap: 18 },
  brandPanel: { minHeight: 108, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.primaryDark, borderRadius: Layout.radius },
  brandIcon: { width: 54, height: 54, borderRadius: 8, backgroundColor: Colors.coffee, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1 },
  brandTitle: { color: Colors.surface, fontSize: 19, fontWeight: '900' },
  brandText: { color: '#D6E6DE', fontSize: 12, lineHeight: 18, marginTop: 4 },
  segmented: { height: 44, flexDirection: 'row', padding: 3, borderRadius: Layout.radius, backgroundColor: Colors.surfaceMuted },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: Colors.surface },
  segmentText: { color: Colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: Colors.primary },
  form: { gap: 14 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  note: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
