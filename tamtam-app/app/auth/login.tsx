import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useLanguage } from '@/hooks/useLanguage'
import { Fonts } from '@/constants/typography'

// PWA auth field look: label above a #141420 input with a white/[0.07]
// border, rounded-xl, placeholder at white/20 (components/auth/FormField).
const labelStyle = {
  fontFamily: Fonts.bodySemiBold,
  fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 8,
} as const

const inputStyle = {
  backgroundColor: Colors.night3,
  borderWidth: 1,
  borderColor: Colors.inputBorder,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: Colors.textPrimary,
  fontFamily: Fonts.body,
  fontSize: 14,
} as const

export default function LoginScreen() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: Colors.bg }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            {/* Brand wordmark — PWA brand moments are `font-syne font-black` (Syne 800) */}
            <Text
              style={{
                fontFamily: Fonts.hero,
                fontSize: 40,
                color: Colors.orange,
                letterSpacing: -1,
              }}
            >
              Tamtam
            </Text>
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 14,
                color: Colors.textMuted,
                marginTop: 4,
              }}
            >
              {t.tagline}
            </Text>
          </View>

          <GoogleSignInButton />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 24,
              gap: 12,
            }}
          >
            <View
              style={{ flex: 1, height: 1, backgroundColor: Colors.border }}
            />
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 12,
                fontFamily: Fonts.body,
              }}
            >
              {t.orSeparator}
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: Colors.border }}
            />
          </View>

          <Text style={labelStyle}>{t.email}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.emailPlaceholder}
            placeholderTextColor={Colors.textGhost}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ ...labelStyle, marginBottom: 0 }}>{t.password}</Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/forgot-password')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 12,
                  fontFamily: Fonts.body,
                }}
              >
                {t.forgotPassword}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.passwordPlaceholder}
            placeholderTextColor={Colors.textGhost}
            secureTextEntry
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {error ? (
            <View
              style={{
                backgroundColor: Colors.errorBg,
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: Colors.error,
                  fontSize: 13,
                  fontFamily: Fonts.body,
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: Colors.orange,
              borderRadius: 12,
              paddingVertical: 14,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {/* PWA auth submit CTA: `font-bold` */}
            <Text
              style={{
                color: '#fff',
                fontFamily: Fonts.bodyBold,
                fontSize: 14,
              }}
            >
              {loading ? '...' : t.login}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            style={{ alignItems: 'center', marginTop: 24, minHeight: 44, justifyContent: 'center' }}
          >
            <Text
              style={{
                color: Colors.textFaint,
                fontSize: 14,
                fontFamily: Fonts.body,
              }}
            >
              {t.noAccount}{' '}
              <Text style={{ color: Colors.teal, fontFamily: Fonts.bodySemiBold }}>{t.register}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
