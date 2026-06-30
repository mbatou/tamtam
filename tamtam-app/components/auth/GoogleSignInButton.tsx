import { TouchableOpacity, Text } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

WebBrowser.maybeCompleteAuthSession()

export function GoogleSignInButton() {
  const { t } = useLanguage()

  const redirectUri = AuthSession.makeRedirectUri()

  async function handleGoogleSignIn() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      )

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url)
        const params = new URLSearchParams(url.hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        }
      }
    }
  }

  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      style={{
        backgroundColor: Colors.night2,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 18, color: Colors.textPrimary }}>G</Text>
      <Text
        style={{
          color: Colors.textPrimary,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 15,
        }}
      >
        {t.continueWithGoogle}
      </Text>
    </TouchableOpacity>
  )
}
