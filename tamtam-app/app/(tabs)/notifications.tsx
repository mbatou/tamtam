import { View, Text, SafeAreaView } from 'react-native'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

export default function NotificationsScreen() {
  const { t } = useLanguage()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 24,
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 24,
          }}
        >
          {t.notifications}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}
      >
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🔔</Text>
        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 18,
            color: Colors.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {t.noNotifications}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: Colors.textMuted,
            textAlign: 'center',
          }}
        >
          {t.noNotificationsSubtitle}
        </Text>
      </View>
    </SafeAreaView>
  )
}
