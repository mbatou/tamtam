import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

export default function TabLayout() {
  const { t } = useLanguage()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Mirrors the PWA .echo-bottom-nav: near-black teal-tinted bar with a
        // teal pill behind the active item (bg-[#1D9E75]/10, rounded-xl).
        tabBarStyle: {
          backgroundColor: Colors.navBg,
          borderTopColor: Colors.navBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarActiveBackgroundColor: Colors.tealMuted,
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 8,
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.navPulse,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rythmes"
        options={{
          title: t.navRythmes,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t.navEarnings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.navProfile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
