import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Share,
  ScrollView,
  Image,
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
import { SHARE_BASE_URL, ECHO_SHARE_PERCENT, formatFCFA } from '@/constants/config'

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
  const isActive = campaign.status === 'active'
  const cover = campaign.creative_urls?.find((u: string) => !u?.match(/\.(mp4|webm)/))
  const earned = trackedLink
    ? Math.floor((trackedLink.click_count || 0) * (campaign.cpc || 0) * ECHO_SHARE_PERCENT / 100)
    : 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-end', marginBottom: 20, minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </TouchableOpacity>

        {cover && (
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16 }}
            resizeMode="cover"
          />
        )}

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

        {/* Status chip + rate (PWA CampaignDetailModal header row) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: isActive ? Colors.badgeTealBg : Colors.btnGhostBg,
              borderWidth: 1,
              borderColor: isActive ? Colors.heroTealBorder : Colors.btnGhostBorder,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: isActive ? Colors.teal : Colors.textMuted }}>
              {isActive ? t.statusActive : campaign.status}
            </Text>
          </View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
            {displayAmount != null
              ? `${displayAmount} FCFA ${isCpa ? t.perAction : t.perClick}`
              : '—'}
          </Text>
        </View>

        {/* Description */}
        {campaign.description ? (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            {campaign.description}
          </Text>
        ) : null}

        {/* Budget progress */}
        {campaign.budget ? (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>{t.budget}</Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textSecondary }}>
                {formatFCFA(campaign.spent || 0)} / {formatFCFA(campaign.budget)}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: Colors.progressTrack, borderRadius: 3, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  backgroundColor: Colors.orange,
                  borderRadius: 3,
                  width: `${Math.min(((campaign.spent || 0) / campaign.budget) * 100, 100)}%`,
                }}
              />
            </View>
          </View>
        ) : null}

        {/* My stats (if accepted) — PWA glass-card clicks | earned */}
        {trackedLink && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.cardBorder,
              borderRadius: 16,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.textPrimary }}>
                {trackedLink.click_count || 0}
              </Text>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.clicks}</Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: Colors.btnGhostBorder }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              {isCpa ? (
                <>
                  <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.teal }}>
                    {formatFCFA(Math.floor((campaign.cpa_amount || 0) * ECHO_SHARE_PERCENT / 100))}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.perConversion}</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: Colors.orange }}>
                    {formatFCFA(earned)}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 9, color: Colors.textMuted }}>{t.earned}</Text>
                </>
              )}
            </View>
          </View>
        )}

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
            backgroundColor: copied ? Colors.teal : Colors.btnGhostBg,
            borderRadius: 12,
            padding: 14,
            minHeight: 44,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: copied ? Colors.teal : Colors.btnGhostBorder,
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
            backgroundColor: Colors.shareGreen,
            borderRadius: 12,
            padding: 16,
            minHeight: 44,
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
