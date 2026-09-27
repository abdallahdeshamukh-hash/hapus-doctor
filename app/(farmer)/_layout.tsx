import { Tabs } from 'expo-router';
import { Home, History, BookOpen, User } from 'lucide-react-native';
import { theme } from '@/lib/theme';

export default function FarmerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'मुख्य पान',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'माझी तपासणी',
          tabBarIcon: ({ size, color }) => <History size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'मार्गदर्शन',
          tabBarIcon: ({ size, color }) => <BookOpen size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'प्रोफाइल',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
