import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native'
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 24,
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 24,
          }}
        >
          {t.profile}
        </Text>

        <View
          style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              backgroundColor: Colors.orangeMuted,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'Syne_800ExtraBold',
                fontSize: 20,
                color: Colors.orange,
              }}
            >
              {profile?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Syne_800ExtraBold',
              fontSize: 18,
              color: Colors.textPrimary,
            }}
          >
            {profile?.name}
          </Text>
          {profile?.city ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.textMuted,
                marginTop: 2,
              }}
            >
              {profile.city}
            </Text>
          ) : null}
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 12,
            color: Colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          {t.language}
        </Text>

        <View
          style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 16,
          }}
        >
          {(
            [
              { code: 'fr' as const, label: t.french },
              { code: 'en' as const, label: t.english },
            ] as const
          ).map((option, i) => (
            <TouchableOpacity
              key={option.code}
              onPress={() => setLang(option.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: i === 0 ? 1 : 0,
                borderBottomColor: Colors.border,
                backgroundColor:
                  lang === option.code ? Colors.orangeMuted : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color:
                    lang === option.code
                      ? Colors.orange
                      : Colors.textSecondary,
                }}
              >
                {option.label}
              </Text>
              {lang === option.code ? (
                <Text style={{ color: Colors.orange, fontSize: 16 }}>✓</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 12,
            color: Colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          {t.settings}
        </Text>

        <View
          style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textSecondary,
            }}
          >
            {t.pushNotifications}
          </Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: Colors.border, true: Colors.teal }}
            thumbColor="#fff"
          />
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: Colors.textFaint,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {t.version} {Constants.expoConfig?.version || '1.0.0'}
        </Text>

        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
              color: Colors.error,
            }}
          >
            {t.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
