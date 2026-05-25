'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

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

export default function LeaderboardPage() {
  const { t, locale } = useTranslation()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/echo/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.id) setCurrentUserId(data.id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/echo/leaderboard?period=all')
      .then(res => res.ok ? res.json() : { leaderboard: [], userEntry: null })
      .then(data => {
        setEntries(data.leaderboard || [])
        setUserEntry(data.userEntry || null)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [currentUserId])

  const totalEchos = entries.length
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  const clicksToNextRank =
    userEntry && userEntry.rank > 1
      ? (() => {
          const above = entries.find(e => e.rank === userEntry.rank - 1)
          return above ? above.total_clicks - userEntry.total_clicks : 0
        })()
      : 0

  const topPercent =
    userEntry && totalEchos > 0
      ? Math.ceil((userEntry.rank / totalEchos) * 100)
      : null

  const fr = locale === 'fr'

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(255,215,0,0.06) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(29,158,117,0.05) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 pb-24">
        {/* Header */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#1D9E75] mb-1">
            {t('echo.leaderboard.eyebrow')}
          </p>
          <h1 className="text-[26px] font-black text-white tracking-[-0.5px] font-syne">
            {t('echo.leaderboard.heroTitle')}
          </h1>
          {!loading && totalEchos > 0 && (
            <p className="text-[12px] text-white/35 mt-0.5">
              {t('echo.leaderboard.ranked', { count: String(totalEchos) })}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
            <span className="text-5xl">&#127942;</span>
            <p className="text-[15px] font-black text-white">
              {t('echo.leaderboard.emptyTitle')}
            </p>
            <p className="text-[12px] text-white/35 leading-relaxed">
              {t('echo.leaderboard.emptyDesc')}
            </p>
            <button
              onClick={() => { window.location.href = '/rythmes' }}
              className="mt-2 bg-[#1D9E75] text-white text-[13px] font-bold px-6 py-3 rounded-xl"
            >
              {t('echo.leaderboard.seeCampaigns')}
            </button>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {top3.length >= 3 && (
              <div className="px-4 pt-2 pb-6 relative">
                <div className="flex items-end justify-center gap-3">
                  {/* 2nd place */}
                  <PodiumSlot
                    entry={top3[1]}
                    medal="&#129352;"
                    crownOrMedal="medal"
                    avatarSize={56}
                    borderColor="#C0C0C0"
                    bgAlpha="rgba(192,192,192,0.15)"
                    podiumHeight="h-12"
                    rankNum={2}
                    nameSize="text-[11px]"
                    clickSize="text-[12px]"
                    clickColor="text-white/60"
                    isMe={currentUserId === top3[1].echo_id}
                    clicksLabel={t('echo.leaderboard.clicks')}
                    fr={fr}
                  />
                  {/* 1st place */}
                  <PodiumSlot
                    entry={top3[0]}
                    medal="&#128081;"
                    crownOrMedal="crown"
                    avatarSize={72}
                    borderColor="#FFD700"
                    bgAlpha="rgba(255,215,0,0.15)"
                    podiumHeight="h-20"
                    rankNum={1}
                    nameSize="text-[12px]"
                    clickSize="text-[14px]"
                    clickColor="text-[#FFD700]"
                    isMe={currentUserId === top3[0].echo_id}
                    clicksLabel={t('echo.leaderboard.clicks')}
                    fr={fr}
                  />
                  {/* 3rd place */}
                  <PodiumSlot
                    entry={top3[2]}
                    medal="&#129353;"
                    crownOrMedal="medal"
                    avatarSize={56}
                    borderColor="#CD7F32"
                    bgAlpha="rgba(205,127,50,0.15)"
                    podiumHeight="h-8"
                    rankNum={3}
                    nameSize="text-[11px]"
                    clickSize="text-[12px]"
                    clickColor="text-white/60"
                    isMe={currentUserId === top3[2].echo_id}
                    clicksLabel={t('echo.leaderboard.clicks')}
                    fr={fr}
                  />
                </div>
              </div>
            )}

            {/* Fewer than 3 — show as simple list */}
            {top3.length > 0 && top3.length < 3 && (
              <div className="px-4 pb-4">
                {top3.map(entry => (
                  <RankRow
                    key={entry.echo_id}
                    entry={entry}
                    isMe={currentUserId === entry.echo_id}
                    clicksLabel={t('echo.leaderboard.clicks')}
                    foundingLabel={t('echo.leaderboard.founding')}
                    fr={fr}
                  />
                ))}
              </div>
            )}

            {/* User rank card */}
            {userEntry && (
              <div className="mx-4 mb-5">
                <div className="bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.25)] rounded-[18px] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[rgba(29,158,117,0.2)] border-2 border-[rgba(29,158,117,0.4)] flex items-center justify-center text-[18px] font-black text-[#5DCAA5] shrink-0">
                      {userEntry.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-white truncate">{userEntry.name}</p>
                      <p className="text-[11px] text-white/40">
                        {t('echo.leaderboard.yourRank')}: <span className="text-[#5DCAA5] font-bold">#{userEntry.rank}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-white/[0.06] mb-3" />
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[18px] font-black text-white">
                        {userEntry.total_clicks.toLocaleString(fr ? 'fr-FR' : 'en')}
                      </p>
                      <p className="text-[10px] text-white/30">{t('echo.leaderboard.clicks')}</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-white">{userEntry.campaigns_joined}</p>
                      <p className="text-[10px] text-white/30">{t('echo.leaderboard.campaigns')}</p>
                    </div>
                  </div>
                  {clicksToNextRank > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="text-[11px] text-white/40 text-center">
                        {t('echo.leaderboard.nextRank', {
                          clicks: String(clicksToNextRank),
                          rank: String(userEntry.rank - 1),
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top X% badge */}
            {topPercent !== null && topPercent <= 25 && (
              <div className="mx-4 mb-4 flex justify-center">
                <div className="flex items-center gap-2 bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] rounded-full px-4 py-2">
                  <span className="text-base">&#11088;</span>
                  <p className="text-[12px] font-bold text-[#FFD700]">
                    {t('echo.leaderboard.topPercent', { percent: String(topPercent) })}
                  </p>
                </div>
              </div>
            )}

            {/* Ranks 4+ list */}
            {rest.length > 0 && (
              <div className="mx-4 rounded-2xl bg-[#111128] border border-white/[0.07] overflow-hidden">
                {rest.map(entry => (
                  <RankRow
                    key={entry.echo_id}
                    entry={entry}
                    isMe={currentUserId === entry.echo_id}
                    clicksLabel={t('echo.leaderboard.clicks')}
                    foundingLabel={t('echo.leaderboard.founding')}
                    fr={fr}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PodiumSlot({
  entry,
  medal,
  crownOrMedal,
  avatarSize,
  borderColor,
  bgAlpha,
  podiumHeight,
  rankNum,
  nameSize,
  clickSize,
  clickColor,
  isMe,
  clicksLabel,
  fr,
}: {
  entry: LeaderboardEntry
  medal: string
  crownOrMedal: 'crown' | 'medal'
  avatarSize: number
  borderColor: string
  bgAlpha: string
  podiumHeight: string
  rankNum: number
  nameSize: string
  clickSize: string
  clickColor: string
  isMe: boolean
  clicksLabel: string
  fr: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <span
        className={crownOrMedal === 'crown' ? 'text-3xl' : 'text-2xl'}
        dangerouslySetInnerHTML={{ __html: medal }}
      />
      <div
        className="rounded-full flex items-center justify-center font-black shrink-0"
        style={{
          width: avatarSize,
          height: avatarSize,
          background: bgAlpha,
          border: `${crownOrMedal === 'crown' ? 3 : 2}px solid ${borderColor}`,
          fontSize: crownOrMedal === 'crown' ? 24 : 20,
          color: borderColor,
        }}
      >
        {entry.name?.charAt(0)?.toUpperCase()}
      </div>
      <p className={`${nameSize} font-bold text-center leading-tight max-w-[80px] truncate ${isMe ? 'text-[#5DCAA5]' : 'text-white/80'}`}>
        {entry.name?.split(' ')[0]}
      </p>
      {entry.city && (
        <p className="text-[9px] text-white/25 -mt-1 truncate max-w-[70px]">{entry.city}</p>
      )}
      <p className={`${clickSize} font-black ${clickColor}`}>
        {entry.total_clicks.toLocaleString(fr ? 'fr-FR' : 'en')}
      </p>
      <p className="text-[9px] text-white/25 -mt-1">{clicksLabel}</p>
      <div
        className={`w-full ${podiumHeight} rounded-t-lg flex items-center justify-center`}
        style={{
          background: bgAlpha,
          borderTop: `2px solid ${borderColor}`,
        }}
      >
        <span
          className="font-black"
          style={{
            fontSize: crownOrMedal === 'crown' ? 20 : rankNum === 2 ? 16 : 14,
            color: borderColor,
          }}
        >
          {rankNum}
        </span>
      </div>
    </div>
  )
}

function RankRow({
  entry,
  isMe,
  clicksLabel,
  foundingLabel,
  fr,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  clicksLabel: string
  foundingLabel: string
  fr: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 ${
        isMe ? 'bg-[rgba(29,158,117,0.05)]' : ''
      }`}
    >
      <div className="w-8 text-center shrink-0">
        <span className={`text-[13px] font-black ${isMe ? 'text-[#5DCAA5]' : 'text-white/25'}`}>
          #{entry.rank}
        </span>
      </div>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 ${
          isMe
            ? 'bg-[rgba(29,158,117,0.2)] text-[#5DCAA5] border border-[rgba(29,158,117,0.4)]'
            : 'bg-white/[0.06] text-white/50'
        }`}
      >
        {entry.name?.charAt(0)?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold truncate ${isMe ? 'text-white' : 'text-white/75'}`}>
          {entry.name}
          {entry.is_founding_echo && (
            <span className="ml-1.5 text-[9px] bg-[rgba(211,84,0,0.15)] text-[#F0997B] px-1.5 py-0.5 rounded-full align-middle">
              {foundingLabel}
            </span>
          )}
        </p>
        {entry.city && (
          <p className="text-[10px] text-white/25 mt-0.5">{entry.city}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[14px] font-black ${isMe ? 'text-[#5DCAA5]' : 'text-white/70'}`}>
          {entry.total_clicks.toLocaleString(fr ? 'fr-FR' : 'en')}
        </p>
        <p className="text-[10px] text-white/25">{clicksLabel}</p>
      </div>
    </div>
  )
}
