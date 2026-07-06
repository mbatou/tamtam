import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { Fonts, Typography } from '@/constants/typography'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

// Shapes returned by GET /api/echo/leaderboard (app/api/echo/leaderboard/route.ts)
interface LeaderboardEntry {
  echo_id: string
  name: string
  city?: string | null
  is_founding_echo?: boolean
  total_clicks: number
  rank: number
  campaigns_joined?: number
}

interface UserEntry {
  echo_id: string
  name: string
  rank: number
  total_clicks: number
  campaigns_joined: number
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  userRank: number | null
  userEntry: UserEntry | null
}

// PWA podium metals (leaderboard/page.tsx PodiumSlot)
const PODIUM = {
  1: { color: '#FFD700', bg: 'rgba(255,215,0,0.15)', medal: '👑', avatar: 72, height: 80 },
  2: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.15)', medal: '🥈', avatar: 56, height: 48 },
  3: { color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', medal: '🥉', avatar: 56, height: 32 },
} as const

export default function RankingScreen() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // Same call as the PWA leaderboard page: all-time ranking, top 20 + own entry.
      const data = await api<LeaderboardResponse>('/api/echo/leaderboard?period=all')
      setLoadError(false)
      setEntries(data.leaderboard || [])
      setUserEntry(data.userEntry || null)
    } catch (err) {
      console.error('[Ranking] loadData failed:', err)
      setLoadError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const myId = profile?.id ?? userEntry?.echo_id ?? null

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
    // Skeleton blocks mirroring the other tabs' loading state
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ padding: 16, paddingTop: 20, gap: 12 }}>
          <View style={{ height: 32, width: 192, borderRadius: 12, backgroundColor: Colors.card }} />
          <View style={{ height: 176, borderRadius: 16, backgroundColor: Colors.card }} />
          <View style={{ height: 128, borderRadius: 16, backgroundColor: Colors.card }} />
          <View style={{ height: 240, borderRadius: 12, backgroundColor: Colors.card }} />
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
        {/* Header (PWA eyebrow `text-[11px] font-medium uppercase tracking-[0.12em]`
            + hero title `text-[26px] font-black font-syne tracking-[-0.5px]`) */}
        <Text style={{ ...Typography.label, fontFamily: Fonts.bodyMedium, color: Colors.teal, fontSize: 11, letterSpacing: 1.3, marginBottom: 4 }}>
          {t.rankingEyebrow}
        </Text>
        <Text style={{ ...Typography.hero, letterSpacing: -0.5 }}>
          {t.rankingTitle}
        </Text>
        {entries.length > 0 && (
          <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, marginTop: 2, marginBottom: 20 }}>
            {entries.length} {t.rankingCount}
          </Text>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={{
            borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20,
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
          }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🏆</Text>
            {/* PWA empty title: `text-[15px] font-black` (DM Sans) */}
            <Text style={{ ...Typography.bodyBold, fontSize: 15, marginBottom: 4 }}>
              {t.rankingEmptyTitle}
            </Text>
            <Text style={{ ...Typography.bodySmall, color: Colors.textFaint, textAlign: 'center', marginBottom: 16 }}>
              {t.rankingEmptyDesc}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/rythmes' as any)}
              style={{
                backgroundColor: Colors.teal, borderRadius: 12,
                paddingHorizontal: 24, paddingVertical: 12, minHeight: 44, justifyContent: 'center',
              }}
            >
              <Text style={{ ...Typography.button, fontSize: 13 }}>{t.rankingSeeCampaigns} →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Podium — top 3 (2nd | 1st | 3rd) */}
        {top3.length >= 3 && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {([2, 1, 3] as const).map((place) => {
              const entry = top3[place - 1]
              const p = PODIUM[place]
              const isMe = myId === entry.echo_id
              const first = place === 1
              return (
                <View key={entry.echo_id} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: first ? 28 : 22 }}>{p.medal}</Text>
                  <View style={{
                    width: p.avatar, height: p.avatar, borderRadius: p.avatar / 2,
                    backgroundColor: p.bg, borderWidth: first ? 3 : 2, borderColor: p.color,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {/* PWA podium initials/figures: `font-black` (DM Sans, no font-syne) */}
                    <Text style={{ fontFamily: Fonts.bodyBold, fontSize: first ? 24 : 20, color: p.color }}>
                      {entry.name?.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      ...Typography.bodySmallBold, fontSize: first ? 12 : 11, textAlign: 'center',
                      color: isMe ? Colors.tealMid : Colors.textSecondary, maxWidth: 80,
                    }}
                  >
                    {entry.name?.split(' ')[0]}
                  </Text>
                  {!!entry.city && (
                    <Text numberOfLines={1} style={{ ...Typography.caption, fontSize: 9, color: Colors.textGhost, marginTop: -4, maxWidth: 70 }}>
                      {entry.city}
                    </Text>
                  )}
                  <Text style={{ fontFamily: Fonts.bodyBold, fontSize: first ? 14 : 12, color: first ? p.color : Colors.textSecondary }}>
                    {entry.total_clicks.toLocaleString(locale)}
                  </Text>
                  <Text style={{ ...Typography.caption, fontSize: 9, color: Colors.textGhost, marginTop: -4 }}>
                    {t.clicks}
                  </Text>
                  <View style={{
                    alignSelf: 'stretch', height: p.height,
                    borderTopLeftRadius: 8, borderTopRightRadius: 8,
                    backgroundColor: p.bg, borderTopWidth: 2, borderTopColor: p.color,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: Fonts.bodyBold, fontSize: first ? 20 : place === 2 ? 16 : 14, color: p.color }}>
                      {place}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Fewer than 3 ranked — plain list instead of a podium */}
        {top3.length > 0 && top3.length < 3 && (
          <View style={{
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
            backgroundColor: Colors.night2, borderWidth: 1, borderColor: Colors.inputBorder,
          }}>
            {top3.map((entry, i) => (
              <RankRow key={entry.echo_id} entry={entry} isMe={myId === entry.echo_id} last={i === top3.length - 1} locale={locale} t={t} />
            ))}
          </View>
        )}

        {/* User rank card (teal-tinted, PWA anatomy) */}
        {userEntry && (
          <View style={{
            borderRadius: 18, padding: 16, marginBottom: 20,
            backgroundColor: Colors.heroTealBg, borderWidth: 1, borderColor: Colors.tealBorder30,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: Colors.tealSoft, borderWidth: 2, borderColor: Colors.tealBorder30,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {/* PWA `text-[18px] font-black` (DM Sans) */}
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.tealMid }}>
                  {userEntry.name?.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ ...Typography.bodyBold }}>
                  {userEntry.name}
                </Text>
                <Text style={{ ...Typography.caption, fontSize: 11 }}>
                  {t.yourRank}:{' '}
                  {/* PWA `font-bold` rank number */}
                  <Text style={{ fontFamily: Fonts.bodyBold, color: Colors.tealMid }}>#{userEntry.rank}</Text>
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: Colors.divider, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...Typography.stat }}>
                  {userEntry.total_clicks.toLocaleString(locale)}
                </Text>
                <Text style={{ ...Typography.caption, marginTop: 2 }}>{t.clicks}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...Typography.stat }}>{userEntry.campaigns_joined}</Text>
                <Text style={{ ...Typography.caption, marginTop: 2 }}>{t.rankingCampaigns}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Ranks 4+ list (PWA bg-[#111128] card with hairline dividers) */}
        {rest.length > 0 && (
          <View style={{
            borderRadius: 16, overflow: 'hidden',
            backgroundColor: Colors.night2, borderWidth: 1, borderColor: Colors.inputBorder,
          }}>
            {rest.map((entry, i) => (
              <RankRow key={entry.echo_id} entry={entry} isMe={myId === entry.echo_id} last={i === rest.length - 1} locale={locale} t={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function RankRow({
  entry,
  isMe,
  last,
  locale,
  t,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  last: boolean
  locale: string
  t: { clicks: string; founding: string }
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.04)',
      backgroundColor: isMe ? 'rgba(29,158,117,0.05)' : 'transparent',
    }}>
      <View style={{ width: 32, alignItems: 'center' }}>
        {/* PWA RankRow figures: `font-black` (DM Sans, no font-syne) */}
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: isMe ? Colors.tealMid : Colors.textFaint }}>
          #{entry.rank}
        </Text>
      </View>
      <View style={{
        width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
        backgroundColor: isMe ? Colors.tealSoft : Colors.btnGhostBg,
        borderWidth: isMe ? 1 : 0, borderColor: Colors.tealBorder30,
      }}>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: isMe ? Colors.tealMid : Colors.textSecondary }}>
          {entry.name?.trim().charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ ...Typography.bodySmallBold, fontSize: 13, color: isMe ? Colors.textPrimary : Colors.textSecondary, flexShrink: 1 }}>
            {entry.name}
          </Text>
          {/* PWA founding pill is regular-weight `text-[9px]` */}
          {entry.is_founding_echo && (
            <View style={{ backgroundColor: Colors.badgeOrangeBg, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ ...Typography.caption, fontSize: 9, color: Colors.orangeMid }}>
                {t.founding}
              </Text>
            </View>
          )}
        </View>
        {!!entry.city && (
          <Text numberOfLines={1} style={{ ...Typography.caption, color: Colors.textGhost, marginTop: 2 }}>
            {entry.city}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: isMe ? Colors.tealMid : Colors.textSecondary }}>
          {entry.total_clicks.toLocaleString(locale)}
        </Text>
        <Text style={{ ...Typography.caption, color: Colors.textGhost }}>{t.clicks}</Text>
      </View>
    </View>
  )
}
