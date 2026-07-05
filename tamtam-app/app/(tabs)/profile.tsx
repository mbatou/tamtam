import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { Colors } from '@/constants/colors'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { formatFCFA } from '@/constants/config'
import { Fonts, Typography } from '@/constants/typography'

// Month + year in the user's language (e.g. "juillet 2026" / "July 2026").
// Hand-rolled month names keep the output deterministic — no Intl dependency.
const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const

function formatMonthYear(iso: string | null | undefined, lang: 'fr' | 'en'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()
  const { t, lang, setLang } = useLanguage()

  // First letter of the name — "?" only when the profile is truly absent.
  const initial = profile?.name?.trim()
    ? profile.name.trim().charAt(0).toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    router.replace('/auth/login')
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        <Text style={{ ...Typography.heading, marginBottom: 20 }}>
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
              backgroundColor: Colors.tealSoft, borderWidth: 1, borderColor: Colors.tealBorder30,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 20, color: Colors.teal }}>
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 18, color: Colors.textPrimary }} numberOfLines={1}>
                {profile?.name}
              </Text>
              {profile?.phone && (
                <Text style={{ ...Typography.bodySmall, marginTop: 2 }}>
                  {profile.phone}
                </Text>
              )}
              {profile?.city && (
                <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, marginTop: 1 }}>
                  {profile.city}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats — 3 columns */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ ...Typography.stat }}>
              {(profile?.total_valid_clicks || 0).toLocaleString('fr-FR')}
            </Text>
            <Text style={{ ...Typography.captionBold, fontSize: 9 }}>{t.validClicks}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ ...Typography.stat, color: Colors.orange }}>
              {formatFCFA(profile?.total_earned || 0)}
            </Text>
            <Text style={{ ...Typography.captionBold, fontSize: 9 }}>{t.earned}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
            <Text style={{ ...Typography.stat }}>
              {formatFCFA(profile?.available_balance || 0)}
            </Text>
            <Text style={{ ...Typography.captionBold, fontSize: 9 }}>{t.balance}</Text>
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
            { label: t.city, value: profile?.city || '—', color: Colors.textPrimary },
            { label: t.memberSince, value: formatMonthYear(profile?.created_at, lang), color: Colors.textPrimary },
          ].map((row, i, rows) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: Colors.divider,
            }}>
              <Text style={{ ...Typography.bodySmall }}>{row.label}</Text>
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: row.color }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Language selector */}
        <Text style={{
          ...Typography.captionBold,
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
                fontFamily: Fonts.body, fontSize: 15,
                color: lang === option.code ? Colors.teal : Colors.textSecondary,
              }}>
                {option.label}
              </Text>
              {lang === option.code && (
                <Text style={{ fontFamily: Fonts.bodySemiBold, color: Colors.teal, fontSize: 16 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications */}
        <Text style={{
          ...Typography.captionBold,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        }}>
          {t.notifications}
        </Text>
        <View style={{
          borderRadius: 12, padding: 16, marginBottom: 16,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textSecondary }}>
            {t.pushComingSoon}
          </Text>
        </View>

        <Text style={{
          fontFamily: Fonts.body, fontSize: 12, color: Colors.textGhost,
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
          <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.error }}>
            {t.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
