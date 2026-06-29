import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans'
import { Syne_800ExtraBold } from '@expo-google-fonts/syne'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { View, ActivityIndicator } from 'react-native'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    Syne_800ExtraBold,
  })

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(() => setReady(true))
      .catch(() => setReady(true))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {})

    return () => subscription.unsubscribe()
  }, [])

  if (!loaded || !ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="campaign/[id]"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </>
  )
}
