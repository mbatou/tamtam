import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Colors } from '@/constants/colors'
import { useLanguage } from '@/hooks/useLanguage'

interface Props {
  campaign: {
    id: string
    title: string
    description?: string
    pricing_model?: string
    cpc?: number
    cpa_amount?: number
    budget?: number
    spent?: number
    status?: string
    creative_urls?: string[]
    brand?: { name?: string; company_name?: string; logo_url?: string }
  }
  isJoined: boolean
  onJoin: () => void
  onPress: () => void
}

export function CampaignCard({ campaign, isJoined, onJoin, onPress }: Props) {
  const { t } = useLanguage()
  const isCpa = campaign.pricing_model === 'cpa'
  const earning = isCpa
    ? Math.floor((campaign.cpa_amount || 0) * 0.75)
    : campaign.cpc || 0

  const formatFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'
  const firstImage = campaign.creative_urls?.find(u => !u?.match(/\.(mp4|webm)/))

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: Colors.card,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
      }}
      activeOpacity={0.8}
    >
      {firstImage && (
        <Image
          source={{ uri: firstImage }}
          style={{ width: '100%', height: 160 }}
          resizeMode="cover"
        />
      )}

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 14,
              color: Colors.textPrimary,
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={2}
          >
            {campaign.title}
          </Text>
          {isJoined && (
            <View style={{
              backgroundColor: Colors.successBg,
              borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
              borderWidth: 1, borderColor: Colors.teal + '33',
            }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: Colors.teal }}>Actif</Text>
            </View>
          )}
        </View>

        {campaign.description && (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: Colors.textFaint,
              marginBottom: 12,
            }}
            numberOfLines={2}
          >
            {campaign.description}
          </Text>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.orange }}>
            {isCpa ? `${formatFCFA(earning)} ${t.perConversion}` : `${earning} FCFA ${t.perClick}`}
          </Text>
          {campaign.budget && campaign.spent !== undefined && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted }}>
              {formatFCFA(campaign.budget - campaign.spent)} {t.remaining}
            </Text>
          )}
        </View>

        {campaign.budget && campaign.spent !== undefined && (
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{
              height: '100%', backgroundColor: Colors.teal, borderRadius: 3,
              width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%`,
            }} />
          </View>
        )}

        <TouchableOpacity
          onPress={isJoined ? onPress : onJoin}
          style={{
            backgroundColor: isJoined ? Colors.teal : Colors.teal,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#fff' }}>
            {isJoined ? t.shareOnWhatsApp : t.acceptRythme}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}
