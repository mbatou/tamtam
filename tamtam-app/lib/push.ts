// Native push notification registration for the mobile app.
//
// The server keeps one row per device token (POST/DELETE /api/echo/push-token,
// Bearer-auth via lib/api.ts). The token currently registered from THIS device
// is persisted in SecureStore so we can unregister it on toggle-off/sign-out.
//
// Every function returns a typed result — nothing here ever throws to the UI.
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from './api'

const PUSH_TOKEN_KEY = 'expo_push_token'

export type RegisterPushResult =
  | { ok: true; token: string }
  /**
   * - `denied`: the user refused (or previously refused) the OS permission —
   *   offer Linking.openSettings().
   * - `unavailable`: getExpoPushTokenAsync threw. Happens in Expo Go (no remote
   *   push since SDK 53) and on EAS builds without Firebase credentials.
   * - `network`: token obtained but the server rejected/failed the registration.
   */
  | { ok: false; reason: 'denied' | 'unavailable' | 'network' }

export type UnregisterPushResult =
  | { ok: true }
  | { ok: false; reason: 'network' }

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * True when this device holds a registered token AND the OS permission is
 * still granted — used to restore the master toggle's initial state.
 */
export async function isPushRegistered(): Promise<boolean> {
  const token = await getStoredToken()
  if (!token) return false
  try {
    const perm = await Notifications.getPermissionsAsync()
    return perm.granted
  } catch {
    return false
  }
}

/**
 * Full opt-in flow: OS permission → Android channel → Expo push token →
 * server registration → local persistence.
 */
export async function registerForPush(): Promise<RegisterPushResult> {
  // 1. OS permission (no-op prompt if already granted/denied).
  let granted = false
  try {
    const perm = await Notifications.requestPermissionsAsync()
    granted = perm.granted
  } catch (err) {
    console.error('[push] requestPermissionsAsync failed:', err)
    return { ok: false, reason: 'unavailable' }
  }
  if (!granted) return { ok: false, reason: 'denied' }

  // 2. Android notification channel — required for the notification to be
  // displayed at all on Android 8+.
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D35400',
      })
    } catch (err) {
      // Non-fatal: the channel may already exist from a previous run.
      console.error('[push] setNotificationChannelAsync failed:', err)
    }
  }

  // 3. Expo push token. Throws in Expo Go and on Android builds without
  // Firebase (FCM) credentials — degrade gracefully, never crash the UI.
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId
  let token: string
  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    token = result.data
  } catch (err) {
    console.error('[push] getExpoPushTokenAsync failed:', err)
    return { ok: false, reason: 'unavailable' }
  }

  // 4. Register with the server (upserts on token).
  try {
    await api('/api/echo/push-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    })
  } catch (err) {
    console.error('[push] token registration failed:', err)
    return { ok: false, reason: 'network' }
  }

  // 5. Remember the token so unregisterPush() can delete this device's row.
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
  } catch (err) {
    console.error('[push] persisting token failed:', err)
  }

  return { ok: true, token }
}

/**
 * Opt-out: delete this device's token server-side, then forget it locally.
 * The local copy is cleared even when the server call fails (the device's
 * intent is OFF); the failure is still reported so the UI can mention it.
 */
export async function unregisterPush(): Promise<UnregisterPushResult> {
  const token = await getStoredToken()
  if (!token) return { ok: true }

  let serverOk = true
  try {
    await api('/api/echo/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    })
  } catch (err) {
    console.error('[push] token unregistration failed:', err)
    serverOk = false
  }

  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
  } catch {}

  return serverOk ? { ok: true } : { ok: false, reason: 'network' }
}
