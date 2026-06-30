import { View, Text, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

export default function PulseScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [activeLinks, setActiveLinks] = useState<any[]>([])
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    const [linksRes, campaignsRes] = await Promise.all([
      supabase
        .from('tracked_links')
        .select('id, campaign_id, short_code, click_count, created_at, campaigns(id, title, description, cpc, cpa_amount, pricing_model, budget, spent, status, creative_urls)')
        .eq('echo_id', profile.id),
      supabase
        .from('campaigns')
        .select('id, title, description, cpc, cpa_amount, pricing_model, budget, spent, status, creative_urls, target_cities')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])

    const links = linksRes.data || []
    setActiveLinks(links)

    const acceptedIds = new Set(links.map((l: any) => l.campaign_id))
    const campaigns = campaignsRes.data || []
    setAvailableCampaigns(campaigns.filter((c: any) => !acceptedIds.has(c.id)))

    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function acceptCampaign(campaignId: string) {
    if (!profile?.id) return
    setAccepting(campaignId)

    const { data } = await supabase
      .from('tracked_links')
      .insert({ campaign_id: campaignId, echo_id: profile.id })
      .select('id')
      .single()

    if (data) await loadData()
    setAccepting(null)
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const totalClicks = activeLinks.reduce((sum: number, l: any) => sum + (l.click_count || 0), 0)
  const totalEarnings = activeLinks.reduce((sum: number, l: any) => {
    const cpc = l.campaigns?.cpc || 0
    return sum + Math.floor(l.click_count * cpc * 0.75)
  }, 0)
  const balance = profile?.available_balance || 0
  const pendingBalance = profile?.pending_balance || 0
  const totalEarned = profile?.total_earned || 0
  const activeCount = activeLinks.filter((l: any) => l.campaigns?.status === 'active').length

  const formatFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />
        }
      >
        {/* Top bar: greeting + avatar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: Colors.textPrimary }}>
              {t.greeting} {profile?.name?.split(' ')[0] || ''}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, marginTop: 2 }}>
              {t.yourPulse}
            </Text>
          </View>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: Colors.tealMuted, borderWidth: 1, borderColor: Colors.teal + '4D',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.teal }}>
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>

        {/* Earnings hero card — teal identity */}
        <View style={{
          backgroundColor: Colors.tealMuted,
          borderRadius: 16, padding: 20, marginBottom: 20,
          borderWidth: 1, borderColor: Colors.teal + '33',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {t.availableBalance}
              </Text>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 28, color: Colors.orange, letterSpacing: -0.5 }}>
                {formatFCFA(balance)}
              </Text>
              {pendingBalance > 0 && (
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.teal, opacity: 0.7, marginTop: 2 }}>
                  +{formatFCFA(pendingBalance)} {t.pendingBalanceLabel}
                </Text>
              )}
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textFaint, marginTop: 2 }}>
                {t.totalEarnedLabel} <Text style={{ color: Colors.orange + 'CC' }}>{formatFCFA(totalEarned)}</Text>
              </Text>
            </View>
            {balance > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/earnings' as any)}
                style={{
                  backgroundColor: Colors.teal, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#fff' }}>
                  {t.withdraw}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {balance === 0 && totalEarned === 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
                {t.balanceZeroNew}
              </Text>
            </View>
          )}
        </View>

        {/* Quick stats row — 3 columns */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {[
            { value: totalClicks, label: t.validClicks, color: Colors.textPrimary },
            { value: formatFCFA(totalEarnings), label: t.fcfaEarned, color: Colors.orange },
            { value: activeCount, label: t.rythmesJoined, color: Colors.textPrimary },
          ].map((stat, i) => (
            <View key={i} style={{
              flex: 1, borderRadius: 12, padding: 12, alignItems: 'center',
              backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
            }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: stat.color }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Active campaigns strip */}
        {activeLinks.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 14, color: Colors.textPrimary }}>
                {t.myRythmes}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/rythmes' as any)}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: Colors.teal }}>
                  {t.seeAll} →
                </Text>
              </TouchableOpacity>
            </View>
            {activeLinks.slice(0, 3).map((link: any) => {
              const campaign = link.campaigns
              if (!campaign) return null
              const earned = Math.floor(link.click_count * (campaign.cpc || 0) * 0.75)
              return (
                <TouchableOpacity
                  key={link.id}
                  onPress={() => router.push(`/campaign/${campaign.id}`)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 12, marginBottom: 8,
                    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 8,
                    backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 16 }}>▶</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textPrimary }} numberOfLines={1}>
                      {campaign.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textMuted }}>
                        {link.click_count} {t.clicks}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.orange }}>
                        {formatFCFA(earned)}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: campaign.status === 'active' ? Colors.teal : Colors.textGhost,
                  }} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Discover campaigns */}
        {availableCampaigns.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 14, color: Colors.textPrimary }}>
                {t.discover}
              </Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.textFaint }}>
                {availableCampaigns.length} {t.available}
              </Text>
            </View>
            {availableCampaigns.slice(0, 2).map((campaign: any) => {
              const isCpa = campaign.pricing_model === 'cpa'
              return (
                <View key={campaign.id} style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 12,
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}>
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }}>
                      {campaign.title}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, marginBottom: 12 }} numberOfLines={2}>
                      {campaign.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.orange }}>
                        {isCpa
                          ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * 0.75))} ${t.perConversion}`
                          : `${campaign.cpc} FCFA ${t.perClick}`
                        }
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
                        {formatFCFA(campaign.budget - campaign.spent)} {t.remaining}
                      </Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                      <View style={{
                        height: '100%', backgroundColor: Colors.teal, borderRadius: 3,
                        width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%`,
                      }} />
                    </View>
                    <TouchableOpacity
                      onPress={() => acceptCampaign(campaign.id)}
                      disabled={accepting === campaign.id}
                      style={{
                        backgroundColor: Colors.teal, borderRadius: 12,
                        paddingVertical: 12, alignItems: 'center',
                        opacity: accepting === campaign.id ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#fff' }}>
                        {accepting === campaign.id ? t.accepting : t.acceptRythme}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Empty state */}
        {activeLinks.length === 0 && availableCampaigns.length === 0 && !loading && (
          <View style={{
            borderRadius: 12, padding: 32, alignItems: 'center',
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }}>
              {t.noAvailable}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, textAlign: 'center' }}>
              {t.notifHint}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
