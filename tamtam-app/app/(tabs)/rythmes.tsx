import { View, Text, SafeAreaView, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import * as Clipboard from 'expo-clipboard'

type TabKey = 'available' | 'mine' | 'done'

export default function RythmesScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [myLinks, setMyLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('available')

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    const [campaignsRes, linksRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, description, cpc, cpa_amount, pricing_model, budget, spent, status, creative_urls, target_cities')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('tracked_links')
        .select('id, campaign_id, short_code, click_count, created_at, campaigns(id, title, description, cpc, cpa_amount, pricing_model, budget, spent, status, creative_urls)')
        .eq('echo_id', profile.id),
    ])

    setCampaigns(campaignsRes.data || [])
    setMyLinks(linksRes.data || [])
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

  async function copyLink(shortCode: string) {
    await Clipboard.setStringAsync(`https://tamma.me/r/${shortCode}`)
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const formatFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'

  const acceptedIds = new Set(myLinks.map((l: any) => l.campaign_id))
  const availableCampaigns = campaigns.filter((c: any) => !acceptedIds.has(c.id))
  const myActiveLinks = myLinks.filter((l: any) => l.campaigns?.status === 'active')
  const finishedLinks = myLinks.filter((l: any) => l.campaigns && l.campaigns.status !== 'active')

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'available', label: t.tabAvailable, count: availableCampaigns.length },
    { key: 'mine', label: t.tabMine, count: myActiveLinks.length },
    { key: 'done', label: t.tabDone, count: finishedLinks.length },
  ]

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
                flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
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
                      <View style={{ backgroundColor: Colors.orangeMuted, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.orange + '33' }}>
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.orange }}>Nouveau</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textFaint, marginBottom: 8 }} numberOfLines={2}>
                      {campaign.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.orange }}>
                        {isCpa ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * 0.75))} ${t.perConversion}` : `${campaign.cpc} FCFA ${t.perClick}`}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
                        {formatFCFA(campaign.budget - campaign.spent)} {t.remaining}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
                      <View style={{ height: '100%', backgroundColor: Colors.teal, borderRadius: 3, width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }} />
                    </View>
                    <TouchableOpacity
                      onPress={() => acceptCampaign(campaign.id)}
                      disabled={accepting === campaign.id}
                      style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: accepting === campaign.id ? 0.5 : 1 }}
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
                Aucun rythme actif
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
              const earned = isCpa ? 0 : Math.floor(link.click_count * campaign.cpc * 0.75)
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
                      <View style={{ backgroundColor: Colors.successBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.teal + '33' }}>
                        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.teal }}>Actif</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary }}>
                        {link.click_count} {t.clicks}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: isCpa ? Colors.teal : Colors.orange }}>
                        {isCpa ? `${formatFCFA(Math.floor((campaign.cpa_amount || 0) * 0.75))} ${t.perConversion}` : `${formatFCFA(earned)} ${t.earned}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => copyLink(link.short_code)}
                      style={{
                        backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderActive,
                        borderRadius: 12, paddingVertical: 10, alignItems: 'center',
                        flexDirection: 'row', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🔗</Text>
                      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary }}>
                        {t.copyLink}
                      </Text>
                    </TouchableOpacity>
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
              const earned = Math.floor(link.click_count * (link.campaigns?.cpc || 0) * 0.75)
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
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.orange }}>
                      {formatFCFA(earned)}
                    </Text>
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
