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
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useLanguage } from '@/hooks/useLanguage'

export default function RegisterScreen() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    if (!name || !email || !password) return
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'echo' },
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.replace('/(tabs)')
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
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text
            style={{
              fontFamily: 'Syne_800ExtraBold',
              fontSize: 40,
              color: Colors.orange,
              letterSpacing: -1,
            }}
          >
            TAMTAM
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textMuted,
              marginTop: 4,
            }}
          >
            Gagne en partageant
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
              fontFamily: 'DMSans_400Regular',
            }}
          >
            ou
          </Text>
          <View
            style={{ flex: 1, height: 1, backgroundColor: Colors.border }}
          />
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t.name}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          style={{
            backgroundColor: Colors.night2,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            padding: 14,
            color: Colors.textPrimary,
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            marginBottom: 12,
          }}
        />

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t.email}
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            backgroundColor: Colors.night2,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            padding: 14,
            color: Colors.textPrimary,
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            marginBottom: 12,
          }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t.password}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          style={{
            backgroundColor: Colors.night2,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            padding: 14,
            color: Colors.textPrimary,
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            marginBottom: 20,
          }}
        />

        {error ? (
          <Text
            style={{
              color: Colors.error,
              fontSize: 13,
              fontFamily: 'DMSans_400Regular',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: Colors.orange,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
            }}
          >
            {loading ? '...' : t.register}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: 'center', marginTop: 24 }}
        >
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 14,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            {t.alreadyAccount}{' '}
            <Text style={{ color: Colors.orange }}>{t.login}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
