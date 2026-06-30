import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { Colors } from '@/constants/colors'
import Constants from 'expo-constants'
import { router } from 'expo-router'

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()
  const { t, lang, setLang } = useLanguage()
  const [pushEnabled, setPushEnabled] = useState(true)

  async function handleSignOut() {
    await signOut()
    router.replace('/auth/login')
  }

  const formatFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: Colors.textPrimary, marginBottom: 20 }}>
          {t.profileTitle}
        </Text>

        {/* Profile card — teal avatar */}
        <View style={{
          borderRadius: 12, padding: 20, marginBottom: 20,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: Colors.tealMuted, borderWidth: 1, borderColor: Colors.teal + '4D',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: Colors.teal }}>
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.textPrimary }}>
                {profile?.name}
              </Text>
              {profile?.phone && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                  {profile.phone}
                </Text>
              )}
              {profile?.city && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, marginTop: 1 }}>
                  {profile.city}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats — 3 columns */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.textPrimary }}>
              {(profile?.total_valid_clicks || 0).toLocaleString('fr-FR')}
            </Text>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.validClicks}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.orange }}>
              {formatFCFA(profile?.total_earned || 0)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.earned}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.orange }}>
              {formatFCFA(profile?.available_balance || 0)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.balance}</Text>
          </View>
        </View>

        {/* Details card */}
        <View style={{
          borderRadius: 12, overflow: 'hidden', marginBottom: 20,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
        }}>
          {[
            { label: t.balance, value: formatFCFA(profile?.available_balance || 0), color: Colors.orange },
            { label: t.totalEarned, value: formatFCFA(profile?.total_earned || 0), color: Colors.orange },
            { label: t.paymentMethod, value: profile?.phone ? t.wave : '—', color: Colors.textPrimary },
          ].map((row, i) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
              borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)',
            }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>{row.label}</Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: row.color }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Language selector */}
        <Text style={{
          fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textMuted,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        }}>
          {t.language}
        </Text>
        <View style={{
          borderRadius: 12, overflow: 'hidden', marginBottom: 16,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
        }}>
          {([
            { code: 'fr' as const, label: t.french },
            { code: 'en' as const, label: t.english },
          ]).map((option, i) => (
            <TouchableOpacity
              key={option.code}
              onPress={() => setLang(option.code)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, borderBottomWidth: i === 0 ? 1 : 0,
                borderBottomColor: 'rgba(255,255,255,0.05)',
                backgroundColor: lang === option.code ? Colors.tealMuted : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: 'DMSans_400Regular', fontSize: 15,
                color: lang === option.code ? Colors.teal : Colors.textSecondary,
              }}>
                {option.label}
              </Text>
              {lang === option.code && (
                <Text style={{ color: Colors.teal, fontSize: 16 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications */}
        <Text style={{
          fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textMuted,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        }}>
          {t.notifications}
        </Text>
        <View style={{
          borderRadius: 12, padding: 16, marginBottom: 16,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary }}>
            {t.pushNotifications}
          </Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: 'rgba(255,255,255,0.10)', true: Colors.teal }}
            thumbColor="#fff"
          />
        </View>

        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textGhost,
          textAlign: 'center', marginBottom: 24,
        }}>
          {t.version} {Constants.expoConfig?.version || '1.0.0'}
        </Text>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)',
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.error }}>
            {t.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
