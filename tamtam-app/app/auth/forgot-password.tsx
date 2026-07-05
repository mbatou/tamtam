import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

export default function ForgotPasswordScreen() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    if (!email) return
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'tamtam://reset-password',
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
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
        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 24,
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          {t.resetPasswordTitle}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: Colors.textMuted,
            marginBottom: 32,
          }}
        >
          {t.resetPasswordSubtitle}
        </Text>

        {sent ? (
          <View
            style={{
              backgroundColor: Colors.tealMuted,
              borderWidth: 1,
              borderColor: Colors.heroTealBorder,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.tealLight,
                textAlign: 'center',
              }}
            >
              {t.resetEmailSent}
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 8,
              }}
            >
              {t.email}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={Colors.textGhost}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: Colors.night3,
                borderWidth: 1,
                borderColor: Colors.inputBorder,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: Colors.textPrimary,
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                marginBottom: 16,
              }}
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
                    fontFamily: 'DMSans_400Regular',
                  }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              style={{
                backgroundColor: Colors.orange,
                borderRadius: 12,
                paddingVertical: 14,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 15,
                }}
              >
                {loading ? '...' : t.resetPassword}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 14,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            {t.back}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
