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
  tier?: string
  campaigns_joined?: number
}

interface LeaderboardProps {
  currentUserId: string
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/echo/leaderboard?period=${period}`)
      .then(res => res.ok ? res.json() : { leaderboard: [], userRank: null })
      .then(data => {
        const all: LeaderboardEntry[] = data.leaderboard || []
        setEntries(all.slice(0, 10))
        if (data.userRank && data.userRank > 10) {
          const me = all.find(e => e.echo_id === currentUserId)
          setCurrentUserEntry(me ? { ...me, rank: data.userRank } : null)
        } else {
          setCurrentUserEntry(null)
        }
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [period, currentUserId])

  const medals = ['', '🥇', '🥈', '🥉']

  return (
    <div className="rounded-2xl bg-[#111128] border border-white/[0.07] overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold font-syne">{t('echo.leaderboard.title')}</h2>
        <a href="/leaderboard" className="text-[11px] text-[#1D9E75] font-semibold">
          {t('echo.dashboard.seeAll')} &rarr;
        </a>
      </div>

      <div className="px-5 pb-3 flex gap-2">
        <button
          onClick={() => setPeriod('weekly')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            period === 'weekly'
              ? 'bg-[#1D9E75] text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          {t('echo.leaderboard.weekly')}
        </button>
        <button
          onClick={() => setPeriod('monthly')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            period === 'monthly'
              ? 'bg-[#1D9E75] text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          {t('echo.leaderboard.monthly')}
        </button>
      </div>

      {currentUserEntry && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-between">
          <span className="text-xs text-[#1D9E75] font-semibold">
            {t('echo.leaderboard.yourRank')}: #{currentUserEntry.rank}
          </span>
          <span className="text-xs font-bold text-white/60">
            {currentUserEntry.total_clicks} {t('echo.leaderboard.clicks')}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : entries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-white/40 mb-1">{t('echo.leaderboard.empty')}</p>
          <p className="text-xs text-white/25">{t('echo.leaderboard.join')}</p>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="space-y-1">
            {entries.map(entry => {
              const isMe = entry.echo_id === currentUserId
              const medal = medals[entry.rank] || ''
              return (
                <div
                  key={entry.echo_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    isMe ? 'bg-[#1D9E75]/10 border border-[#1D9E75]/20' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="w-6 text-center text-xs font-bold text-white/40 shrink-0">
                    {medal || `#${entry.rank}`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center text-xs font-bold text-[#1D9E75] shrink-0">
                    {entry.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold truncate ${isMe ? 'text-[#1D9E75]' : ''}`}>
                        {entry.name}
                      </span>
                      {entry.is_founding_echo && (
                        <span className="text-[10px]" title="Écho Fondateur">&#129351;</span>
                      )}
                    </div>
                    {entry.city && (
                      <span className="text-[10px] text-white/25">{entry.city}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white/60 shrink-0">
                    {entry.total_clicks} <span className="text-[10px] text-white/30 font-normal">{t('echo.leaderboard.clicks')}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
