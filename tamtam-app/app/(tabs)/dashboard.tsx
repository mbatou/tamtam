import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

export default function DashboardScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()

  const stats = [
    {
      label: t.totalClicks,
      value: (profile?.total_valid_clicks || 0).toLocaleString('fr-FR'),
      color: Colors.orange,
    },
    {
      label: t.totalEarned,
      value: `${(profile?.total_earned || 0).toLocaleString('fr-FR')} F`,
      color: Colors.teal,
    },
    {
      label: t.availableBalance,
      value: `${(profile?.available_balance || 0).toLocaleString('fr-FR')} F`,
      color: Colors.tealLight,
    },
    {
      label: t.pendingBalance,
      value: `${(profile?.pending_balance || 0).toLocaleString('fr-FR')} F`,
      color: Colors.textSecondary,
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 24,
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t.myEarnings}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: Colors.textMuted,
            marginBottom: 24,
          }}
        >
          {profile?.name}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {stats.map((stat, i) => (
            <View
              key={i}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: Colors.bgCard,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Syne_800ExtraBold',
                  fontSize: 24,
                  color: stat.color,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: Colors.textMuted,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {(profile?.available_balance || 0) > 0 && (
          <TouchableOpacity
            style={{
              backgroundColor: Colors.teal,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 15,
                color: '#fff',
              }}
            >
              {t.requestPayout}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
