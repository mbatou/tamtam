import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/colors'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
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

  if (session) return <Redirect href="/(tabs)" />
  return <Redirect href="/auth/login" />
}
