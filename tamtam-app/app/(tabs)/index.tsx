import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { ECHO_SHARE_PERCENT, formatFCFA } from '@/constants/config'
import { Fonts, Typography } from '@/constants/typography'

export default function PulseScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [activeLinks, setActiveLinks] = useState<any[]>([])
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // GET /api/echo/links → tracked_links rows with joined `campaigns`;
      // GET /api/echo/campaigns → active, approved (city-targeted) campaigns.
      const [links, campaigns] = await Promise.all([
        api<any[]>('/api/echo/links'),
        api<any[]>('/api/echo/campaigns'),
      ])

      setLoadError(false)
      setActiveLinks(links || [])

      const acceptedIds = new Set((links || []).map((l: any) => l.campaign_id))
      setAvailableCampaigns((campaigns || []).filter((c: any) => !acceptedIds.has(c.id)))
    } catch (err) {
      console.error('[Pulse] loadData failed:', err)
      setLoadError(true)
    }
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function acceptCampaign(campaignId: string) {
    if (!profile?.id) return
    setAccepting(campaignId)

    try {
      // POST /api/echo/links generates the short_code server-side.
      await api('/api/echo/links', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      await loadData()
    } catch (err) {
      console.error('[Pulse] acceptCampaign failed:', err)
      Alert.alert(t.error, t.acceptError)
    }
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
    return sum + Math.floor(l.click_count * cpc * ECHO_SHARE_PERCENT / 100)
  }, 0)
  const balance = profile?.available_balance || 0
  const pendingBalance = profile?.pending_balance || 0
  const totalEarned = profile?.total_earned || 0
  const activeCount = activeLinks.filter((l: any) => l.campaigns?.status === 'active').length

  if (loadError) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ ...Typography.bodyBold, marginBottom: 12, textAlign: 'center' }}>
            {t.loadError}
          </Text>
          <TouchableOpacity
            onPress={loadData}
            style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...Typography.button, fontSize: 13 }}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    // Skeleton blocks mirroring the PWA dashboard loading state
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ padding: 16, paddingTop: 20, gap: 16 }}>
          <View style={{ height: 32, width: 192, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 128, borderRadius: 16, backgroundColor: Colors.card }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, height: 80, borderRadius: 12, backgroundColor: Colors.card }} />
            <View style={{ flex: 1, height: 80, borderRadius: 12, backgroundColor: Colors.card }} />
            <View style={{ flex: 1, height: 80, borderRadius: 12, backgroundColor: Colors.card }} />
          </View>
          <View style={{ height: 40, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 160, borderRadius: 12, backgroundColor: Colors.card }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />
        }
      >
        {/* Top bar: greeting + avatar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            {/* PWA echo.dashboard.greeting: "Salut {name} 👋" / "Hey {name} 👋" */}
            <Text style={{ ...Typography.heading }}>
              {t.greeting} {profile?.name?.split(' ')[0] || ''} 👋
            </Text>
            <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, marginTop: 2 }}>
              {t.yourPulse}
            </Text>
          </View>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: Colors.tealSoft, borderWidth: 1, borderColor: Colors.tealBorder30,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.teal }}>
              {profile?.name?.trim() ? profile.name.trim().charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        {/* Earnings hero card — teal identity (PWA .echo-earnings-bg) */}
        <View style={{
          backgroundColor: Colors.heroTealBg,
          borderRadius: 16, padding: 20, marginBottom: 20,
          borderWidth: 1, borderColor: Colors.heroTealBorder,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.label, marginBottom: 4 }}>
                {t.availableBalance}
              </Text>
              <Text style={{ ...Typography.balance }}>
                {formatFCFA(balance)}
              </Text>
              {pendingBalance > 0 && (
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.teal, opacity: 0.7, marginTop: 2 }}>
                  +{formatFCFA(pendingBalance)} {t.pendingBalanceLabel}
                </Text>
              )}
              <Text style={{ ...Typography.caption, marginTop: 2 }}>
                {t.totalEarnedLabel} <Text style={{ color: Colors.orange + 'CC' }}>{formatFCFA(totalEarned)}</Text>
              </Text>
            </View>
            {balance > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/earnings' as any)}
                style={{
                  backgroundColor: Colors.teal, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, justifyContent: 'center',
                }}
              >
                <Text style={{ ...Typography.button, fontSize: 12 }}>
                  {t.withdraw}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {balance === 0 && totalEarned === 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider }}>
              <Text style={{ ...Typography.bodySmall }}>
                🎯 {t.balanceZeroNew}
              </Text>
            </View>
          )}
          {balance === 0 && totalEarned > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider }}>
              <Text style={{ ...Typography.bodySmall }}>
                💡 {t.balanceZeroEarned}
              </Text>
            </View>
          )}
        </View>

        {/* Quick stats row — 3 columns (first tile carries the PWA live-dot) */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {[
            { value: totalClicks, label: t.validClicks, color: Colors.textPrimary, liveDot: true },
            { value: formatFCFA(totalEarnings), label: t.fcfaEarned, color: Colors.orange, liveDot: false },
            { value: activeCount, label: t.rythmesJoined, color: Colors.textPrimary, liveDot: false },
          ].map((stat, i) => (
            <View key={i} style={{
              flex: 1, borderRadius: 12, padding: 12, alignItems: 'center',
              backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
            }}>
              {stat.liveDot && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal, marginBottom: 3 }} />
              )}
              {/* PWA `text-lg font-black` (DM Sans) */}
              <Text style={{ ...Typography.stat, color: stat.color }}>
                {stat.value}
              </Text>
              <Text style={{ ...Typography.captionSemiBold, fontSize: 9, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Active campaigns strip */}
        {activeLinks.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ ...Typography.headingSmall }}>
                {t.myRythmes}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/rythmes' as any)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.teal }}>
                  {t.seeAll} →
                </Text>
              </TouchableOpacity>
            </View>
            {/* Horizontal mini-card strip (PWA CampaignMiniCard carousel) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {activeLinks.slice(0, 5).map((link: any) => {
                const campaign = link.campaigns
                if (!campaign) return null
                const earned = Math.floor(link.click_count * (campaign.cpc || 0) * ECHO_SHARE_PERCENT / 100)
                const thumb = campaign.creative_urls?.find((u: string) => !u?.match(/\.(mp4|webm)/))
                return (
                  <TouchableOpacity
                    key={link.id}
                    onPress={() => router.push(`/campaign/${campaign.id}`)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, minWidth: 200,
                      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                    }}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{
                        width: 40, height: 40, borderRadius: 8,
                        backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="play-circle-outline" size={18} color={Colors.teal} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {/* PWA CampaignMiniCard: title `text-xs font-bold`, earned `text-[10px] font-bold` */}
                      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.textPrimary }} numberOfLines={1}>
                        {campaign.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted }}>
                          {link.click_count} {t.clicks}
                        </Text>
                        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.orange }}>
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
            </ScrollView>
          </View>
        )}

        {/* Discover campaigns */}
        {availableCampaigns.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ ...Typography.headingSmall }}>
                {t.discover}
              </Text>
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.textFaint }}>
                {availableCampaigns.length} {t.available}{availableCampaigns.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {availableCampaigns.slice(0, 2).map((campaign: any) => {
              const isCpa = campaign.pricing_model === 'cpa'
              const cover = campaign.creative_urls?.find((u: string) => !u?.match(/\.(mp4|webm)/))
              return (
                <View key={campaign.id} style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 12,
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}>
                  {cover && (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/campaign/${campaign.id}`)}>
                      <Image source={{ uri: cover }} style={{ width: '100%', height: 144 }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  <View style={{ padding: 16 }}>
                    <Text
                      onPress={() => router.push(`/campaign/${campaign.id}`)}
                      style={{ ...Typography.bodyBold, marginBottom: 4 }}
                    >
                      {campaign.title}
                    </Text>
                    <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, marginBottom: 12 }} numberOfLines={2}>
                      {campaign.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      {/* PWA `text-sm font-bold text-[#D35400]` */}
                      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.orange }}>
                        {isCpa
                          ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * ECHO_SHARE_PERCENT / 100))} ${t.perConversion}`
                          : `${campaign.cpc} FCFA ${t.perClick}`
                        }
                      </Text>
                      <Text style={{ ...Typography.bodySmall }}>
                        {formatFCFA(campaign.budget - campaign.spent)} {t.remaining}
                      </Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 6, backgroundColor: Colors.progressTrack, borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
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
                        paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                        opacity: accepting === campaign.id ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ ...Typography.button }}>
                        {accepting === campaign.id ? t.accepting : t.acceptRythme}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
            {availableCampaigns.length > 2 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/rythmes' as any)}
                style={{
                  paddingVertical: 12, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.teal }}>
                  {t.seeAll} ({availableCampaigns.length - 2} {t.moreAvailable})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty state */}
        {activeLinks.length === 0 && availableCampaigns.length === 0 && !loading && (
          <View style={{
            borderRadius: 12, padding: 32, alignItems: 'center',
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
            {/* PWA empty state title is `text-sm font-semibold` */}
            <Text style={{ ...Typography.bodySemiBold, marginBottom: 4 }}>
              {t.noAvailable}
            </Text>
            <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, textAlign: 'center', marginBottom: 16 }}>
              {t.notifHint}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as any)}
              style={{
                alignSelf: 'stretch', paddingVertical: 12, minHeight: 44, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: Colors.btnGhostBg, borderWidth: 1, borderColor: Colors.btnGhostBorder,
              }}
            >
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.textPrimary }}>
                🤝 {t.inviteFriend}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
