import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/colors';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'cafe-outline',
  favorites: 'heart-outline',
  orders: 'receipt-outline',
  profile: 'person-outline',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? icons[route.name].replace('-outline', '') as keyof typeof Ionicons.glyphMap : icons[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Thực đơn' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Yêu thích' }} />
      <Tabs.Screen name="orders" options={{ title: 'Đơn hàng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />
    </Tabs>
  );
}

