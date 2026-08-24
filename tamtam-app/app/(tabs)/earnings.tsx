import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { formatFCFA } from '@/constants/config'
import { Fonts, Typography } from '@/constants/typography'

export default function EarningsScreen() {
  const { profile, refetchProfile } = useAuth()
  const { t } = useLanguage()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  // The withdrawal floor is a platform setting, not a constant. This screen
  // used to hardcode 500 while the real minimum is 1 000, so it enabled
  // "Retirer" for balances the web page then refused — the same
  // offer-then-refuse mismatch that blocked withdrawals outright.
  const [minPayout, setMinPayout] = useState(1000)

  const loadPayouts = useCallback(async () => {
    if (!profile?.id) return
    try {
      // GET /api/echo/payouts → full payout rows, newest first.
      // Balance figures (available/pending/total_earned) stay on the profile
      // from useAuth (/api/echo/user) — /api/echo/balance lacks total_earned.
      const [data, balanceData] = await Promise.all([
        api<any[]>('/api/echo/payouts'),
        api<{ min_withdrawal?: number }>('/api/echo/balance').catch(() => null),
      ])
      setLoadError(false)
      setPayouts((data || []).slice(0, 20))
      if (balanceData?.min_withdrawal) setMinPayout(balanceData.min_withdrawal)
    } catch (err) {
      console.error('[Earnings] loadPayouts failed:', err)
      setLoadError(true)
    }
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([loadPayouts(), refetchProfile()])
    setRefreshing(false)
  }

  const balance = profile?.available_balance || 0
  const pendingBalance = profile?.pending_balance || 0
  const totalEarned = profile?.total_earned || 0
  const hasPendingPayout = payouts.some((p: any) => p.status === 'pending' || p.status === 'processing')

  // Mirrors the PWA payout pill palette (teal/orange/red at 15% bg, 20% border)
  function getStatusStyle(status: string) {
    if (status === 'sent') return { bg: Colors.badgeTealBg, text: Colors.teal, border: Colors.heroTealBorder, label: t.sent }
    if (status === 'pending' || status === 'processing') return { bg: Colors.badgeOrangeBg, text: Colors.orange, border: Colors.badgeOrangeBorder, label: t.pending }
    return { bg: Colors.errorBg, text: Colors.error, border: 'rgba(239,68,68,0.2)', label: t.failed }
  }

  if (loadError) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ ...Typography.bodyBold, marginBottom: 12, textAlign: 'center' }}>
            {t.loadError}
          </Text>
          <TouchableOpacity
            onPress={loadPayouts}
            style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...Typography.button, fontSize: 13 }}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    // Skeleton blocks mirroring the PWA earnings loading state
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ padding: 16, paddingTop: 20, gap: 12 }}>
          <View style={{ height: 24, width: 112, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 144, borderRadius: 16, backgroundColor: Colors.card }} />
          <View style={{ height: 24, width: 160, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 64, borderRadius: 12, backgroundColor: Colors.card }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        <Text style={{ ...Typography.heading, marginBottom: 20 }}>
          {t.earningsTitle}
        </Text>

        {/* Balance card (PWA .echo-earnings-bg hero: rounded-2xl p-4) */}
        <View style={{
          backgroundColor: Colors.heroTealBg, borderRadius: 16, padding: 16, marginBottom: 20,
          borderWidth: 1, borderColor: Colors.heroTealBorder,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ ...Typography.label, marginBottom: 2 }}>
                {t.availableBalance}
              </Text>
              <Text style={{ ...Typography.balance }}>
                {formatFCFA(balance)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...Typography.caption }}>
                {t.totalEarned}
              </Text>
              {/* PWA `text-sm font-bold text-[#D35400]` */}
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.orange }}>
                {formatFCFA(totalEarned)}
              </Text>
            </View>
          </View>

          {hasPendingPayout ? (
            <View style={{
              marginTop: 12, padding: 12, borderRadius: 12,
              backgroundColor: Colors.tealMuted, borderWidth: 1, borderColor: Colors.heroTealBorder,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <ActivityIndicator size="small" color={Colors.teal} />
              {/* PWA processing note is regular-weight `text-sm` */}
              <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.teal, flex: 1 }}>
                {t.processing}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                disabled={balance < minPayout}
                onPress={() => Linking.openURL('https://tamma.me/earnings')}
                style={{
                  marginTop: 12, paddingVertical: 12, minHeight: 44, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: balance >= minPayout ? Colors.teal : Colors.btnGhostBg,
                  borderWidth: balance >= minPayout ? 0 : 1,
                  borderColor: Colors.btnGhostBorder,
                }}
              >
                {/* PWA withdraw CTA: `text-sm font-bold` */}
                <Text style={{
                  fontFamily: Fonts.bodyBold, fontSize: 14,
                  color: balance >= minPayout ? '#fff' : Colors.textGhost,
                }}>
                  {t.withdraw}
                </Text>
              </TouchableOpacity>
              <Text style={{
                ...Typography.caption,
                textAlign: 'center', marginTop: 8,
              }}>
                {t.withdrawOnWeb}
              </Text>
            </>
          )}
        </View>

        {/* Pending balance */}
        {pendingBalance > 0 && (
          <View style={{
            borderRadius: 16, padding: 20, marginBottom: 20,
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.badgeOrangeBorder,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ ...Typography.label, marginBottom: 2 }}>
                  {t.pendingEarnings}
                </Text>
                {/* PWA `text-2xl font-black` (DM Sans, clamps to 700) */}
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 24, color: Colors.orange }}>
                  {formatFCFA(pendingBalance)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ ...Typography.caption }}>
                  {t.totalAll}
                </Text>
                {/* PWA `text-sm font-bold text-white/60` */}
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.textSecondary }}>
                  {formatFCFA(balance + pendingBalance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payout history (PWA h2 `text-sm font-bold text-white/60 uppercase tracking-wider`) */}
        <Text style={{
          fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.textSecondary,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
        }}>
          {t.history}
        </Text>

        {payouts.length === 0 ? (
          <View style={{
            borderRadius: 12, padding: 24, alignItems: 'center',
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          }}>
            <Text style={{ ...Typography.bodySmall, color: Colors.textFaint }}>
              {t.noWithdraw}
            </Text>
          </View>
        ) : (
          payouts.map((payout: any) => {
            const style = getStatusStyle(payout.status)
            return (
              <View key={payout.id} style={{
                borderRadius: 12, padding: 16, marginBottom: 8,
                backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: style.text }}>
                      {payout.status === 'sent' ? '✓' : payout.status === 'pending' || payout.status === 'processing' ? '⏳' : '✕'}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ ...Typography.bodyBold }}>
                      {formatFCFA(payout.amount)}
                    </Text>
                    <Text style={{ ...Typography.caption }}>
                      {payout.provider === 'wave' ? t.wave : t.orangeMoney}
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: style.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
                  borderWidth: 1, borderColor: style.border,
                }}>
                  {/* PWA status pill: `text-[10px] font-bold` */}
                  <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 10, color: style.text }}>
                    {style.label}
                  </Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
