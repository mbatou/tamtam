import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { View, ActivityIndicator } from 'react-native'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  // Full PWA font stack (globals.css): Syne 700/800 + DM Sans 400/500/600/700.
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Syne_700Bold,
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
    // expo-router usually mounts its own SafeAreaProvider, but Android devices
    // were rendering under the status/nav bars — provide one explicitly so
    // every SafeAreaView/useSafeAreaInsets below is guaranteed real insets.
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  )
}
