import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Share,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { Colors } from '@/constants/colors'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { formatFCFA } from '@/constants/config'
import { Fonts, Typography } from '@/constants/typography'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { isPushRegistered, registerForPush, unregisterPush } from '@/lib/push'

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

// Granular push preference keys — mirrors the PWA PushNotificationSettings
// list (subset of the server's ALLOWED_KEYS in /api/echo/notification-prefs).
const PREF_KEYS = ['new_campaign', 'share_reminder', 'inactivity', 'campaign_ending'] as const
type PrefKey = (typeof PREF_KEYS)[number]

const DEFAULT_PREFS: Record<PrefKey, boolean> = {
  new_campaign: true,
  share_reminder: true,
  inactivity: true,
  campaign_ending: true,
}

// Shared card container (PWA `rounded-xl bg-white/[0.03] border border-white/[0.06]`).
const card = {
  borderRadius: 12,
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.cardBorder,
} as const

// PWA form inputs (same recipe as the auth screens).
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

const fieldLabelStyle = {
  fontFamily: Fonts.bodySemiBold,
  fontSize: 12,
  color: Colors.textMuted,
  marginBottom: 4,
} as const

// PWA toggle colors: ON track #1D9E75, OFF track white/10, white thumb.
function PrefSwitch({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{ false: 'rgba(255,255,255,0.10)', true: Colors.teal }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="rgba(255,255,255,0.10)"
    />
  )
}

export default function ProfileScreen() {
  const { profile, signOut, refetchProfile } = useAuth()
  const { t, lang, setLang } = useLanguage()

  // Feedback banners (PWA-style green/red cards at the top).
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Edit profile
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', city: '', mobile_money_provider: '' })

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const [pushUnavailable, setPushUnavailable] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS)

  // SMS
  const [smsEnabled, setSmsEnabled] = useState(true)

  // Password
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const flashSuccess = useCallback((msg: string) => {
    setError('')
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }, [])

  // Restore the master toggle from this device's stored token + OS permission,
  // and load the saved per-type preferences.
  useEffect(() => {
    isPushRegistered().then(setPushEnabled).catch(() => {})
    api<Record<string, boolean>>('/api/echo/notification-prefs')
      .then((prefs) => {
        setNotifPrefs((prev) => {
          const next = { ...prev }
          for (const key of PREF_KEYS) {
            if (typeof prefs[key] === 'boolean') next[key] = prefs[key]
          }
          return next
        })
      })
      .catch(() => {})
  }, [])

  // Sync server-backed toggles/fields once the profile arrives.
  useEffect(() => {
    if (!profile) return
    setSmsEnabled(!profile.sms_optout)
    if (!editing) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        mobile_money_provider: profile.mobile_money_provider || '',
      })
    }
  }, [profile, editing])

  // First letter of the name — "?" only when the profile is truly absent.
  const initial = profile?.name?.trim()
    ? profile.name.trim().charAt(0).toUpperCase()
    : '?'

  // Referral code — same fallback as the PWA ReferralCard.
  const referralCode =
    profile?.referral_code ||
    (profile?.name?.split(' ')[0]?.toUpperCase() || 'TAMTAM') + '-TT'
  const referralLink = `https://tamma.me/register?ref=${referralCode}`

  async function handleSignOut() {
    // signOut() unregisters this device's push token before ending the session.
    await signOut()
    router.replace('/auth/login')
  }

  async function handleSaveProfile() {
    if (!form.name.trim()) {
      setError(t.nameRequiredError)
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api('/api/echo/user', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setEditing(false)
      refetchProfile()
      flashSuccess(t.profileUpdated)
    } catch (err) {
      console.error('[profile] save failed:', err)
      setError(t.networkRetry)
    }
    setSaving(false)
  }

  async function handleTogglePush() {
    if (pushBusy) return
    setPushBusy(true)
    setPushDenied(false)
    setError('')
    if (pushEnabled) {
      const res = await unregisterPush()
      setPushEnabled(false)
      if (res.ok) flashSuccess(t.pushDisabledMsg)
      else setError(t.networkRetry)
    } else {
      const res = await registerForPush()
      if (res.ok) {
        setPushEnabled(true)
        setPushUnavailable(false)
        flashSuccess(t.pushEnabledMsg)
      } else if (res.reason === 'denied') {
        setPushDenied(true)
      } else if (res.reason === 'unavailable') {
        // EAS build without Firebase credentials, or Expo Go — degrade politely.
        setPushUnavailable(true)
      } else {
        setError(t.networkRetry)
      }
    }
    setPushBusy(false)
  }

  // Optimistic per-type toggle with rollback — mirrors the PWA component.
  async function handleTogglePref(key: PrefKey) {
    const newVal = !notifPrefs[key]
    setNotifPrefs((prev) => ({ ...prev, [key]: newVal }))
    try {
      await api('/api/echo/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify({ [key]: newVal }),
      })
    } catch (err) {
      console.error('[profile] pref toggle failed:', err)
      setNotifPrefs((prev) => ({ ...prev, [key]: !newVal }))
    }
  }

  // Optimistic SMS opt-in/out with rollback — mirrors the PWA SmsToggle
  // (sms_optout is handled by the notification-prefs endpoint server-side).
  async function handleToggleSms() {
    const newVal = !smsEnabled
    setSmsEnabled(newVal)
    try {
      await api('/api/echo/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify({
          sms_optout: !newVal,
          sms_optout_at: !newVal ? new Date().toISOString() : null,
        }),
      })
      refetchProfile()
    } catch (err) {
      console.error('[profile] sms toggle failed:', err)
      setSmsEnabled(!newVal)
    }
  }

  async function handleShareInvite() {
    try {
      await Share.share({ message: t.inviteMessage.replace('{code}', referralCode) })
    } catch {
      // User dismissed the sheet — nothing to report.
    }
  }

  async function handleCopyReferral() {
    try {
      await Clipboard.setStringAsync(referralLink)
      flashSuccess(t.referralCopied)
    } catch (err) {
      console.error('[profile] clipboard failed:', err)
    }
  }

  async function handleChangePassword() {
    setError('')
    setSuccess('')
    if (newPassword.length < 6) {
      setError(t.passwordMin)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }
    setPwSaving(true)
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
    if (pwError) {
      console.error('[profile] password update failed:', pwError)
      setError(pwError.message || t.error)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      flashSuccess(t.passwordUpdated)
    }
    setPwSaving(false)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        <Text style={{ ...Typography.heading, marginBottom: 20 }}>
          {t.profileTitle}
        </Text>

        {/* Feedback banners (PWA-style) */}
        {!!error && (
          <View style={{ borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.error }}>{error}</Text>
          </View>
        )}
        {!!success && (
          <View style={{ borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.heroTealBorder }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.tealMid }}>{success}</Text>
          </View>
        )}

        {/* Profile card — teal avatar + edit button */}
        <View style={{ ...card, padding: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: Colors.tealSoft, borderWidth: 1, borderColor: Colors.tealBorder30,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {/* PWA avatar initial: `text-xl font-black` (DM Sans) */}
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.teal }}>
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {/* PWA h2 `text-lg font-bold` */}
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.textPrimary }} numberOfLines={1}>
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
            {!editing && (
              <TouchableOpacity
                onPress={() => { setEditing(true); setError(''); setSuccess('') }}
                style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.teal }}>
                  ✎ {t.edit}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Edit form (PWA ProfileEditForm) */}
        {editing && (
          <View style={{ ...card, padding: 20, marginBottom: 20, gap: 14 }}>
            <Text style={{ ...Typography.bodyBold }}>{t.editProfile}</Text>
            <View>
              <Text style={fieldLabelStyle}>{t.nameRequired}</Text>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                placeholder={t.namePlaceholder}
                placeholderTextColor={Colors.textGhost}
                style={inputStyle}
              />
            </View>
            <View>
              <Text style={fieldLabelStyle}>{t.phone}</Text>
              <TextInput
                value={form.phone}
                onChangeText={(phone) => setForm({ ...form, phone })}
                placeholder="+221 77 000 00 00"
                placeholderTextColor={Colors.textGhost}
                keyboardType="phone-pad"
                style={inputStyle}
              />
            </View>
            <View>
              <Text style={fieldLabelStyle}>{t.city}</Text>
              <TextInput
                value={form.city}
                onChangeText={(city) => setForm({ ...form, city })}
                placeholderTextColor={Colors.textGhost}
                style={inputStyle}
              />
            </View>
            <View>
              <Text style={fieldLabelStyle}>{t.paymentMethod}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { id: 'wave', label: t.wave },
                  { id: 'orange_money', label: t.orangeMoney },
                ].map((option) => {
                  const selected = form.mobile_money_provider === option.id
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setForm({ ...form, mobile_money_provider: option.id })}
                      style={{
                        flex: 1, padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 2, justifyContent: 'center',
                        borderColor: selected ? Colors.teal : Colors.borderActive,
                        backgroundColor: selected ? Colors.tealMuted : Colors.btnGhostBg,
                      }}
                    >
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.textPrimary }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={saving || !form.name.trim()}
                style={{
                  flex: 1, paddingVertical: 13, minHeight: 44, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: Colors.teal, opacity: saving || !form.name.trim() ? 0.5 : 1,
                }}
              >
                <Text style={{ ...Typography.button }}>{saving ? t.saving : t.save}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditing(false)
                  setForm({
                    name: profile?.name || '',
                    phone: profile?.phone || '',
                    city: profile?.city || '',
                    mobile_money_provider: profile?.mobile_money_provider || '',
                  })
                }}
                style={{
                  paddingHorizontal: 20, paddingVertical: 13, minHeight: 44, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: Colors.borderActive,
                }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.textSecondary }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats — 3 columns */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <View style={{ ...card, flex: 1, padding: 12, alignItems: 'center' }}>
            <Text style={{ ...Typography.stat }}>
              {(profile?.total_valid_clicks || 0).toLocaleString('fr-FR')}
            </Text>
            <Text style={{ ...Typography.captionSemiBold, fontSize: 9 }}>{t.validClicks}</Text>
          </View>
          <View style={{ ...card, flex: 1, padding: 12, alignItems: 'center' }}>
            <Text style={{ ...Typography.stat, color: Colors.orange }}>
              {formatFCFA(profile?.total_earned || 0)}
            </Text>
            <Text style={{ ...Typography.captionSemiBold, fontSize: 9 }}>{t.earned}</Text>
          </View>
          <View style={{ ...card, flex: 1, padding: 12, alignItems: 'center' }}>
            <Text style={{ ...Typography.stat }}>
              {formatFCFA(profile?.available_balance || 0)}
            </Text>
            <Text style={{ ...Typography.captionSemiBold, fontSize: 9 }}>{t.balance}</Text>
          </View>
        </View>

        {/* Founding Echo badge (PWA FoundingEchoBadge) */}
        {profile?.is_founding_echo && (
          <View style={{
            ...card, borderColor: 'rgba(253,239,66,0.20)', padding: 16, marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <Text style={{ fontSize: 28 }}>🥇</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: '#FDEF42' }}>
                {t.foundingEchoTitle}
              </Text>
              <Text style={{ ...Typography.caption, marginTop: 2 }}>
                {t.foundingEchoDesc}
              </Text>
            </View>
          </View>
        )}

        {/* Referral card (PWA ReferralCard) */}
        <View style={{ ...card, padding: 16, marginBottom: 20 }}>
          <Text style={{ ...Typography.bodyBold, marginBottom: 6 }}>
            🤝 {t.inviteFriends}
          </Text>
          <Text style={{ ...Typography.bodySmall, marginBottom: 10 }}>{t.inviteDesc}</Text>
          <View style={{
            borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12,
            backgroundColor: Colors.btnGhostBg, borderWidth: 1, borderColor: Colors.borderActive,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{ ...Typography.captionSemiBold }}>{t.referralCodeLabel}</Text>
            <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.teal }}>
              {referralCode}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleShareInvite}
              style={{
                flex: 1, paddingVertical: 12, minHeight: 44, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: Colors.whatsappBg, borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)',
              }}
            >
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.whatsapp }}>
                {t.inviteCta}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCopyReferral}
              style={{
                flex: 1, paddingVertical: 12, minHeight: 44, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: Colors.btnGhostBg, borderWidth: 1, borderColor: Colors.borderActive,
              }}
            >
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.textPrimary }}>
                {t.copyLink}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details card */}
        <View style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
          {/* PWA AccountDetailsCard: money rows `text-xs font-bold`, others `text-xs font-semibold` */}
          {[
            { label: t.balance, value: formatFCFA(profile?.available_balance || 0), color: Colors.orange, bold: true },
            { label: t.totalEarned, value: formatFCFA(profile?.total_earned || 0), color: Colors.orange, bold: true },
            {
              label: t.paymentMethod,
              value: profile?.mobile_money_provider === 'orange_money'
                ? t.orangeMoney
                : profile?.mobile_money_provider === 'wave'
                  ? t.wave
                  : '—',
              color: Colors.textPrimary,
              bold: false,
            },
            { label: t.city, value: profile?.city || '—', color: Colors.textPrimary, bold: false },
            { label: t.memberSince, value: formatMonthYear(profile?.created_at, lang), color: Colors.textPrimary, bold: false },
          ].map((row, i, rows) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: Colors.divider,
            }}>
              <Text style={{ ...Typography.bodySmall }}>{row.label}</Text>
              <Text style={{ fontFamily: row.bold ? Fonts.bodyBold : Fonts.bodySemiBold, fontSize: 12, color: row.color }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Password section (PWA PasswordSection) */}
        <View style={{ ...card, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...Typography.bodyBold }}>{t.password}</Text>
            {!showPassword && (
              <TouchableOpacity
                onPress={() => { setShowPassword(true); setError(''); setSuccess('') }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.teal }}>
                  {t.changePassword}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {showPassword ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <View>
                <Text style={fieldLabelStyle}>{t.newPassword}</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t.minChars}
                  placeholderTextColor={Colors.textGhost}
                  secureTextEntry
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={fieldLabelStyle}>{t.confirmPassword}</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t.repeatPassword}
                  placeholderTextColor={Colors.textGhost}
                  secureTextEntry
                  style={inputStyle}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={pwSaving || !newPassword || !confirmPassword}
                  style={{
                    flex: 1, paddingVertical: 13, minHeight: 44, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: Colors.teal,
                    opacity: pwSaving || !newPassword || !confirmPassword ? 0.5 : 1,
                  }}
                >
                  <Text style={{ ...Typography.button }}>{pwSaving ? t.updating : t.update}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowPassword(false); setNewPassword(''); setConfirmPassword('') }}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 13, minHeight: 44, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: Colors.borderActive,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.textSecondary }}>
                    {t.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, marginTop: 6 }}>
              {t.passwordStrong}
            </Text>
          )}
        </View>

        {/* Notifications */}
        <Text style={{ ...Typography.label, marginBottom: 8 }}>
          {t.notifications}
        </Text>

        {/* Push notifications (PWA PushNotificationSettings, native flow) */}
        <View style={{ ...card, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ ...Typography.bodyBold }}>{t.pushNotifications}</Text>
              <Text style={{ ...Typography.caption, marginTop: 2 }}>
                {pushEnabled ? t.statusEnabled : t.statusDisabled}
              </Text>
            </View>
            <PrefSwitch value={pushEnabled} onToggle={handleTogglePush} disabled={pushBusy} />
          </View>

          {/* Permission denied: explain + deep-link to the system settings */}
          {pushDenied && (
            <View style={{
              marginTop: 12, borderRadius: 10, padding: 12,
              backgroundColor: 'rgba(253,239,66,0.06)', borderWidth: 1, borderColor: 'rgba(253,239,66,0.20)',
            }}>
              <Text style={{ ...Typography.bodySmall, color: Colors.textSecondary }}>
                {t.pushDenied}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.teal }}>
                  {t.openSettings}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* EAS build without FCM credentials / Expo Go: friendly caption, no crash */}
          {pushUnavailable && (
            <Text style={{ ...Typography.caption, marginTop: 10 }}>
              {t.pushUnavailable}
            </Text>
          )}

          {/* Granular per-type switches (PWA list, same keys) */}
          {pushEnabled && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider }}>
              <Text style={{ ...Typography.caption, marginBottom: 4 }}>{t.pushPrefsTitle}</Text>
              {PREF_KEYS.map((key) => (
                <View
                  key={key}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
                >
                  <Text style={{ ...Typography.bodySmall, color: Colors.textSecondary }}>
                    {{
                      new_campaign: t.prefNewCampaign,
                      share_reminder: t.prefShareReminder,
                      inactivity: t.prefInactivity,
                      campaign_ending: t.prefCampaignEnding,
                    }[key]}
                  </Text>
                  <PrefSwitch value={notifPrefs[key]} onToggle={() => handleTogglePref(key)} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SMS toggle (PWA SmsToggle) */}
        <View style={{ ...card, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ ...Typography.bodyBold }}>{t.smsNotifications}</Text>
              <Text style={{ ...Typography.caption, marginTop: 2 }}>
                {smsEnabled ? t.statusEnabled : t.statusDisabled}
              </Text>
            </View>
            <PrefSwitch value={smsEnabled} onToggle={handleToggleSms} />
          </View>
          <Text style={{ ...Typography.caption, color: Colors.textGhost, marginTop: 8 }}>
            {t.smsDesc}
          </Text>
        </View>

        {/* Language selector */}
        <Text style={{ ...Typography.label, marginBottom: 8 }}>
          {t.language}
        </Text>
        <View style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
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
            borderRadius: 12, paddingVertical: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center',
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
