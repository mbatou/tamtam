import { View, Text, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity, Image, Share, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import * as Clipboard from 'expo-clipboard'
import { SHARE_BASE_URL, ECHO_SHARE_PERCENT, formatFCFA } from '@/constants/config'

type TabKey = 'available' | 'mine' | 'done'

export default function RythmesScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [myLinks, setMyLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('available')

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // GET /api/echo/campaigns → active, approved (city-targeted) campaigns;
      // GET /api/echo/links → tracked_links rows with joined `campaigns`.
      const [campaignList, links] = await Promise.all([
        api<any[]>('/api/echo/campaigns'),
        api<any[]>('/api/echo/links'),
      ])

      setLoadError(false)
      setCampaigns(campaignList || [])
      setMyLinks(links || [])
    } catch (err) {
      console.error('[Rythmes] loadData failed:', err)
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
      console.error('[Rythmes] acceptCampaign failed:', err)
      Alert.alert(t.error, t.acceptError)
    }
    setAccepting(null)
  }

  async function copyLink(shortCode: string) {
    await Clipboard.setStringAsync(`${SHARE_BASE_URL}/r/${shortCode}`)
  }

  async function shareLink(shortCode: string, title: string) {
    try {
      await Share.share({ message: `${title}\n\n${SHARE_BASE_URL}/r/${shortCode}` })
    } catch (err) {
      console.error('[Rythmes] Share.share failed:', err)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const acceptedIds = new Set(myLinks.map((l: any) => l.campaign_id))
  const availableCampaigns = campaigns.filter((c: any) => !acceptedIds.has(c.id))
  const myActiveLinks = myLinks.filter((l: any) => l.campaigns?.status === 'active')
  const finishedLinks = myLinks.filter((l: any) => l.campaigns && l.campaigns.status !== 'active')

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'available', label: t.tabAvailable, count: availableCampaigns.length },
    { key: 'mine', label: t.tabMine, count: myActiveLinks.length },
    { key: 'done', label: t.tabDone, count: finishedLinks.length },
  ]

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
            {t.loadError}
          </Text>
          <TouchableOpacity
            onPress={loadData}
            style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }}
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#fff' }}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    // Skeleton blocks mirroring the PWA rythmes loading state
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ padding: 16, paddingTop: 20, gap: 12 }}>
          <View style={{ height: 24, width: 112, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 40, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 176, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 176, borderRadius: 12, backgroundColor: Colors.card }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: Colors.textPrimary, marginBottom: 16 }}>
          {t.rythmesTitle}
        </Text>

        {/* 3-tab bar */}
        <View style={{
          flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, marginBottom: 20,
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
        }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, paddingVertical: 10, minHeight: 40, borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: activeTab === tab.key ? Colors.teal : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: 'DMSans_600SemiBold', fontSize: 12,
                color: activeTab === tab.key ? '#fff' : Colors.textMuted,
              }}>
                {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB: Available */}
        {activeTab === 'available' && (
          availableCampaigns.length === 0 ? (
            <View style={{ borderRadius: 12, padding: 24, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }}>
                {t.noAvailableRythmes}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, textAlign: 'center' }}>
                {t.notifHint}
              </Text>
            </View>
          ) : (
            availableCampaigns.map((campaign: any) => {
              const isCpa = campaign.pricing_model === 'cpa'
              const firstImage = campaign.creative_urls?.find((u: string) => !u?.match(/\.(mp4|webm)/))
              return (
                <View key={campaign.id} style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 12,
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}>
                  {firstImage && (
                    <Image source={{ uri: firstImage }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                  )}
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, flex: 1, marginRight: 8 }}>
                        {campaign.title}
                      </Text>
                      <View style={{ backgroundColor: Colors.badgeOrangeBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.badgeOrangeBorder }}>
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.orange }}>{t.newBadge}</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, marginBottom: 8 }} numberOfLines={2}>
                      {campaign.description}
                    </Text>
                    {campaign.target_cities && campaign.target_cities.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {campaign.target_cities.map((city: string) => (
                          <View key={city} style={{ backgroundColor: Colors.tealMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.tealMid }}>📍 {city}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {isCpa && (
                      <View style={{ backgroundColor: Colors.tealMuted, borderWidth: 1, borderColor: Colors.heroTealBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}>
                        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.tealMid }}>{t.cpaHint}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.orange }}>
                        {isCpa ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * ECHO_SHARE_PERCENT / 100))} ${t.perConversion}` : `${campaign.cpc} FCFA ${t.perClick}`}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
                        {formatFCFA(campaign.budget - campaign.spent)} {t.remaining}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: Colors.progressTrack, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
                      <View style={{ height: '100%', backgroundColor: Colors.teal, borderRadius: 3, width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }} />
                    </View>
                    <TouchableOpacity
                      onPress={() => acceptCampaign(campaign.id)}
                      disabled={accepting === campaign.id}
                      style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: accepting === campaign.id ? 0.5 : 1 }}
                    >
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#fff' }}>
                        {accepting === campaign.id ? t.accepting : t.acceptRythme}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )
        )}

        {/* TAB: My Rythmes */}
        {activeTab === 'mine' && (
          myActiveLinks.length === 0 ? (
            <View style={{ borderRadius: 12, padding: 32, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }}>
                {t.noActiveRythmes}
              </Text>
              <TouchableOpacity onPress={() => setActiveTab('available')} style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 8, marginTop: 12 }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#fff' }}>{t.discover}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myActiveLinks.map((link: any) => {
              const campaign = link.campaigns
              if (!campaign) return null
              const isCpa = campaign.pricing_model === 'cpa'
              const earned = isCpa ? 0 : Math.floor(link.click_count * campaign.cpc * ECHO_SHARE_PERCENT / 100)
              const firstImage = campaign.creative_urls?.find((u: string) => !u?.match(/\.(mp4|webm)/))
              return (
                <View key={link.id} style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 12,
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}>
                  {firstImage && (
                    <Image source={{ uri: firstImage }} style={{ width: '100%', height: 144 }} resizeMode="cover" />
                  )}
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, flex: 1, marginRight: 8 }} numberOfLines={1}>
                        {campaign.title}
                      </Text>
                      <View style={{ backgroundColor: Colors.badgeTealBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.heroTealBorder }}>
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.teal }}>{t.statusActive}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="pulse-outline" size={12} color={Colors.textSecondary} />
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary }}>
                          {link.click_count}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: isCpa ? Colors.teal : Colors.orange }}>
                        {isCpa ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * ECHO_SHARE_PERCENT / 100))} ${t.perConversion}` : `${formatFCFA(earned)} ${t.earned}`}
                      </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => shareLink(link.short_code, campaign.title)}
                        style={{
                          backgroundColor: Colors.shareGreen, borderRadius: 12,
                          paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 8,
                        }}
                      >
                        <Ionicons name="share-social-outline" size={18} color="#fff" />
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#fff' }}>
                          {t.shareOnWhatsApp}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => copyLink(link.short_code)}
                        style={{
                          backgroundColor: Colors.btnGhostBg, borderWidth: 1, borderColor: Colors.btnGhostBorder,
                          borderRadius: 12, paddingVertical: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>🔗</Text>
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary }}>
                          {t.copyLink}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textFaint, textAlign: 'center', marginTop: 8 }}>
                      📱 {t.shareWhatsAppHint}
                    </Text>
                  </View>
                </View>
              )
            })
          )
        )}

        {/* TAB: Done */}
        {activeTab === 'done' && (
          finishedLinks.length === 0 ? (
            <View style={{ borderRadius: 12, padding: 24, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>📊</Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }}>
                {t.noFinished}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, textAlign: 'center' }}>
                {t.finishedHint}
              </Text>
            </View>
          ) : (
            finishedLinks.map((link: any) => {
              const finishedCpa = link.campaigns?.pricing_model === 'cpa'
              const earned = finishedCpa ? 0 : Math.floor(link.click_count * (link.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100)
              return (
                <View key={link.id} style={{
                  borderRadius: 12, padding: 16, marginBottom: 8,
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
                }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 }} numberOfLines={1}>
                    {link.campaigns?.title || '—'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
                      {link.click_count} {t.clicks}
                    </Text>
                    {finishedCpa ? (
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.teal }}>CPA</Text>
                    ) : (
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.orange }}>
                        {formatFCFA(earned)}
                      </Text>
                    )}
                  </View>
                </View>
              )
            })
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
