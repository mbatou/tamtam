import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'
import { SHARE_BASE_URL } from '@/constants/config'

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [campaign, setCampaign] = useState<any>(null)
  const [trackedLink, setTrackedLink] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(false)

    try {
      // No single-campaign endpoint — fetch the user's links (each carries a
      // joined `campaigns` row, covering finished campaigns too) and the
      // discoverable campaign list, then match by id client-side.
      const [links, campaigns] = await Promise.all([
        api<any[]>('/api/echo/links'),
        api<any[]>('/api/echo/campaigns'),
      ])

      const myLink = (links || []).find((l: any) => l.campaign_id === id) || null
      const c = myLink?.campaigns || (campaigns || []).find((camp: any) => camp.id === id) || null

      if (!c) {
        console.error('[CampaignDetail] campaign not found:', id)
        setLoadError(true)
        setLoading(false)
        return
      }
      setCampaign(c)
      setTrackedLink(myLink)
    } catch (err) {
      console.error('[CampaignDetail] load failed:', err)
      setLoadError(true)
    }
    setLoading(false)
  }, [id, profile?.id])

  useEffect(() => {
    load()
  }, [load])

  const shareUrl = trackedLink
    ? `${SHARE_BASE_URL}/r/${trackedLink.short_code || trackedLink.id}`
    : null

  async function handleCopy() {
    if (!shareUrl) return
    await Clipboard.setStringAsync(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!shareUrl || !campaign) return
    try {
      await Share.share({
        message: `${campaign.title}\n\n${shareUrl}`,
      })
    } catch (err) {
      console.error('[CampaignDetail] Share.share failed:', err)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      </SafeAreaView>
    )
  }

  if (loadError || !campaign) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
            {t.loadError}
          </Text>
          <TouchableOpacity
            onPress={load}
            style={{ backgroundColor: Colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }}
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#fff' }}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isCpa = campaign.pricing_model === 'cpa'
  const displayAmount = isCpa ? campaign.cpa_amount : campaign.cpc

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-end', marginBottom: 20 }}
        >
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: Colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          {campaign.brand?.company_name || campaign.brand?.name}
        </Text>

        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 22,
            color: Colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          {campaign.title}
        </Text>

        <View
          style={{
            backgroundColor: Colors.orangeMuted,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginVertical: 20,
          }}
        >
          <Text
            style={{
              fontFamily: 'Syne_800ExtraBold',
              fontSize: 36,
              color: Colors.orange,
            }}
          >
            {displayAmount != null ? `${displayAmount} FCFA` : '—'}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textMuted,
              marginTop: 4,
            }}
          >
            {isCpa ? t.perAction : t.perClick}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 15,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          {t.shareTitle}
        </Text>

        {shareUrl ? (
          <View
            style={{
              backgroundColor: Colors.night2,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: Colors.border,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {shareUrl}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleCopy}
          style={{
            backgroundColor: copied ? Colors.teal : Colors.night2,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: copied ? Colors.teal : Colors.border,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={18}
            color={copied ? '#fff' : Colors.textMuted}
          />
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
              color: copied ? '#fff' : Colors.textSecondary,
            }}
          >
            {copied ? t.linkCopied : t.copyLink}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={{
            backgroundColor: Colors.orange,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
              color: '#fff',
            }}
          >
            {t.shareOnWhatsApp}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
