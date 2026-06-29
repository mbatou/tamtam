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
    visual_url?: string
    brand?: { name?: string; company_name?: string; logo_url?: string }
  }
  isJoined: boolean
  onJoin: () => void
  onPress: () => void
}

export function CampaignCard({ campaign, isJoined, onJoin, onPress }: Props) {
  const { t } = useLanguage()
  const earning =
    campaign.pricing_model === 'cpa'
      ? campaign.cpa_amount || 0
      : campaign.cpc || 50

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
      }}
      activeOpacity={0.8}
    >
      {campaign.visual_url ? (
        <Image
          source={{ uri: campaign.visual_url }}
          style={{ width: '100%', height: 160, backgroundColor: Colors.bgMuted }}
          resizeMode="cover"
        />
      ) : null}

      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: Colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 4,
          }}
        >
          {campaign.brand?.company_name || campaign.brand?.name || ''}
        </Text>

        <Text
          style={{
            fontFamily: 'Syne_800ExtraBold',
            fontSize: 16,
            color: Colors.textPrimary,
            marginBottom: 12,
            letterSpacing: -0.3,
          }}
          numberOfLines={2}
        >
          {campaign.title}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              backgroundColor: Colors.orangeMuted,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              style={{
                fontFamily: 'Syne_800ExtraBold',
                fontSize: 16,
                color: Colors.orange,
              }}
            >
              {earning} F
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.textMuted,
              }}
            >
              {t.perClick}
            </Text>
          </View>

          <TouchableOpacity
            onPress={isJoined ? onPress : onJoin}
            style={{
              backgroundColor: isJoined ? Colors.teal : Colors.orange,
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 14,
                color: '#fff',
              }}
            >
              {isJoined ? t.shareNow : t.joinCampaign}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}
