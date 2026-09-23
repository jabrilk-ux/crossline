import { Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography } from '../../constants/theme';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 1000;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: '#132743', borderRightColor: colors.border, ...(wide ? {width:200,minWidth:200,maxWidth:200,paddingTop:32} : {height:84,paddingTop:10,paddingBottom:18}) },
        tabBarActiveTintColor: colors.skyLight,
        tabBarActiveBackgroundColor: colors.surfaceRaised,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: {
          fontFamily: typography.caption.fontFamily,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) =>
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) =>
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="laws"
        options={{
          title: 'Laws',
          tabBarIcon: ({ color, size, focused }) =>
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Trip',
          tabBarIcon: ({ color, size, focused }) =>
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) =>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
