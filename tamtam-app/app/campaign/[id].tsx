import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Share,
  ScrollView,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, router } from 'expo-router'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [campaign, setCampaign] = useState<any>(null)
  const [trackedLink, setTrackedLink] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      const { data: c } = await supabase
        .from('campaigns')
        .select('*, brand:users!batteur_id(name, company_name)')
        .eq('id', id)
        .single()
      setCampaign(c)

      if (profile?.id) {
        const { data: tl } = await supabase
          .from('tracked_links')
          .select('id, tm_ref, short_code')
          .eq('campaign_id', id)
          .eq('echo_id', profile.id)
          .maybeSingle()
        setTrackedLink(tl)
      }
    }

    load()
  }, [id, profile?.id])

  const shareUrl = trackedLink
    ? `https://tamma.me/r/${trackedLink.short_code || trackedLink.id}`
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
    } catch {}
  }

  if (!campaign) return null

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
            {campaign.cpc || campaign.cpa_amount || 50} FCFA
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textMuted,
              marginTop: 4,
            }}
          >
            {t.perClick}
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
