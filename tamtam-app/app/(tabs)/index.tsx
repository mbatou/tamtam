import { View, Text, SafeAreaView, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

export default function CampaignsScreen() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from('campaigns')
      .select(
        `
        id, title, description, objective, pricing_model,
        cpc, cpa_amount, budget, spent, status,
        visual_url, target_cities, created_at,
        brand:users!batteur_id (name, company_name, logo_url)
      `
      )
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setCampaigns(data || [])
    setLoading(false)
  }, [])

  const fetchJoinedCampaigns = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('tracked_links')
      .select('campaign_id')
      .eq('echo_id', profile.id)

    setJoinedIds(data?.map((tl: { campaign_id: string }) => tl.campaign_id) || [])
  }, [profile?.id])

  useEffect(() => {
    fetchCampaigns()
    fetchJoinedCampaigns()
  }, [fetchCampaigns, fetchJoinedCampaigns])

  async function handleJoin(campaignId: string) {
    if (!profile?.id) return

    const { data } = await supabase
      .from('tracked_links')
      .insert({
        campaign_id: campaignId,
        echo_id: profile.id,
      })
      .select('id, tm_ref')
      .single()

    if (data) {
      setJoinedIds((prev) => [...prev, campaignId])
      router.push(`/campaign/${campaignId}`)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchCampaigns()
    await fetchJoinedCampaigns()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: 'Syne_800ExtraBold',
              fontSize: 24,
              color: Colors.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Tamtam
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: Colors.textMuted,
              marginTop: 2,
            }}
          >
            {campaigns.length} {t.availableCampaigns}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: Colors.tealMuted,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: Colors.teal + '40',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 13,
              color: Colors.tealLight,
            }}
          >
            {(profile?.available_balance || 0).toLocaleString('fr-FR')} F
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text
            style={{
              color: Colors.textMuted,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            {t.loading}
          </Text>
        </View>
      ) : campaigns.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <Text style={{ fontSize: 32, marginBottom: 16 }}>📢</Text>
          <Text
            style={{
              fontFamily: 'Syne_800ExtraBold',
              fontSize: 18,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t.noCampaigns}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textMuted,
              textAlign: 'center',
            }}
          >
            {t.noCampaignsSubtitle}
          </Text>
        </View>
      ) : (
        <FlashList
          data={campaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.orange}
            />
          }
          renderItem={({ item }) => (
            <CampaignCard
              campaign={item}
              isJoined={joinedIds.includes(item.id)}
              onJoin={() => handleJoin(item.id)}
              onPress={() => router.push(`/campaign/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}
