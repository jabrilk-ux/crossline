import { Tabs } from 'expo-router';
import { colors, typography } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.sky,
        tabBarInactiveTintColor: colors.silver,
        tabBarLabelStyle: {
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="laws" options={{ title: 'Laws' }} />
      <Tabs.Screen name="trip" options={{ title: 'Trip' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
