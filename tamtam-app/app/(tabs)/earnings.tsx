import { View, Text, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

export default function EarningsScreen() {
  const { profile, refetchProfile } = useAuth()
  const { t } = useLanguage()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadPayouts = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('wave_payouts')
      .select('id, amount, status, provider, created_at')
      .eq('echo_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setPayouts(data || [])
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

  const formatFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'
  const balance = profile?.available_balance || 0
  const pendingBalance = profile?.pending_balance || 0
  const totalEarned = profile?.total_earned || 0
  const hasPendingPayout = payouts.some((p: any) => p.status === 'pending' || p.status === 'processing')

  function getStatusStyle(status: string) {
    if (status === 'sent') return { bg: Colors.successBg, text: Colors.teal, border: Colors.teal + '33', label: t.sent }
    if (status === 'pending' || status === 'processing') return { bg: Colors.orangeMuted, text: Colors.orange, border: Colors.orange + '33', label: t.pending }
    return { bg: Colors.errorBg, text: Colors.error, border: 'rgba(239,68,68,0.2)', label: t.failed }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: Colors.textPrimary, marginBottom: 20 }}>
          {t.earningsTitle}
        </Text>

        {/* Balance card */}
        <View style={{
          backgroundColor: Colors.tealMuted, borderRadius: 16, padding: 20, marginBottom: 20,
          borderWidth: 1, borderColor: Colors.teal + '33',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                {t.availableBalance}
              </Text>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 28, color: Colors.orange }}>
                {formatFCFA(balance)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textFaint }}>
                {t.totalEarned}
              </Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.orange }}>
                {formatFCFA(totalEarned)}
              </Text>
            </View>
          </View>

          {hasPendingPayout ? (
            <View style={{
              marginTop: 12, padding: 12, borderRadius: 12,
              backgroundColor: Colors.tealMuted, borderWidth: 1, borderColor: Colors.teal + '33',
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.teal }}>
                ⏳ {t.pending}...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              disabled={balance < 500}
              style={{
                marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                backgroundColor: balance >= 500 ? Colors.teal : 'rgba(255,255,255,0.05)',
                borderWidth: balance >= 500 ? 0 : 1,
                borderColor: Colors.borderActive,
                opacity: balance >= 500 ? 1 : 0.5,
              }}
            >
              <Text style={{
                fontFamily: 'DMSans_600SemiBold', fontSize: 14,
                color: balance >= 500 ? '#fff' : Colors.textGhost,
              }}>
                {t.withdraw}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pending balance */}
        {pendingBalance > 0 && (
          <View style={{
            borderRadius: 16, padding: 20, marginBottom: 20,
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.orange + '33',
          }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
              {t.pendingEarnings}
            </Text>
            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 24, color: Colors.orange }}>
              {formatFCFA(pendingBalance)}
            </Text>
          </View>
        )}

        {/* Payout history */}
        <Text style={{
          fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
        }}>
          {t.history}
        </Text>

        {payouts.length === 0 ? (
          <View style={{
            borderRadius: 12, padding: 24, alignItems: 'center',
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint }}>
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
                    <Text style={{ fontSize: 12 }}>
                      {payout.status === 'sent' ? '✓' : payout.status === 'pending' || payout.status === 'processing' ? '⏳' : '✕'}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary }}>
                      {formatFCFA(payout.amount)}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textFaint }}>
                      {payout.provider === 'wave' ? t.wave : t.orangeMoney}
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: style.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
                  borderWidth: 1, borderColor: style.border,
                }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: style.text }}>
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
