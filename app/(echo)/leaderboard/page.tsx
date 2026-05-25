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

type Period = 'weekly' | 'monthly' | 'all'

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('weekly')
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
    fetch(`/api/echo/leaderboard?period=${period}`)
      .then(res => res.ok ? res.json() : { leaderboard: [], userRank: null, userEntry: null })
      .then(data => {
        setEntries(data.leaderboard || [])
        setUserEntry(data.userEntry || null)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [period, currentUserId])

  const medals = ['', '\u{1F947}', '\u{1F948}', '\u{1F949}']

  return (
    <div className="px-4 py-5 min-h-screen">
      <h1 className="text-xl font-bold font-syne mb-5">{t('echo.leaderboard.title')}</h1>

      {/* Period pills */}
      <div className="flex gap-2 mb-5">
        {(['weekly', 'monthly', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
              period === p
                ? 'bg-[#1D9E75] text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {t(`echo.leaderboard.${p}`)}
          </button>
        ))}
      </div>

      {/* Pinned user card */}
      {userEntry && (
        <div className="mb-5 rounded-2xl bg-[#1D9E75]/5 border border-[#1D9E75]/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#1D9E75]/20 border-2 border-[#1D9E75]/40 flex items-center justify-center text-sm font-bold text-[#1D9E75] shrink-0">
              {userEntry.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-[#1D9E75] truncate block">{userEntry.name}</span>
              <span className="text-[10px] text-white/30">
                {t('echo.leaderboard.yourRank')}: <span className="font-bold text-white/60">#{userEntry.rank}</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1D9E75]/10">
            <div className="text-center">
              <span className="text-sm font-black block">{userEntry.total_clicks}</span>
              <span className="text-[9px] text-white/35">{t('echo.leaderboard.clicks')}</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-black block">{userEntry.campaigns_joined}</span>
              <span className="text-[9px] text-white/35">{t('echo.leaderboard.campaigns')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-[#111128] border border-white/[0.07] px-5 py-16 text-center">
          <p className="text-sm text-white/40 mb-1">{t('echo.leaderboard.empty')}</p>
          <p className="text-xs text-white/25">{t('echo.leaderboard.join')}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#111128] border border-white/[0.07] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {entries.map(entry => {
              const isMe = currentUserId ? entry.echo_id === currentUserId : false
              const medal = medals[entry.rank] || ''
              return (
                <div
                  key={entry.echo_id}
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    isMe ? 'bg-[#1D9E75]/10' : ''
                  }`}
                >
                  <span className="w-8 text-center text-xs font-bold text-white/40 shrink-0">
                    {medal || `#${entry.rank}`}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center text-sm font-bold text-[#1D9E75] shrink-0">
                    {entry.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${isMe ? 'text-[#1D9E75]' : ''}`}>
                        {entry.name}
                      </span>
                      {entry.is_founding_echo && (
                        <span className="text-xs" title={t('echo.leaderboard.foundingEcho')}>&#129351;</span>
                      )}
                    </div>
                    {entry.city && (
                      <span className="text-[10px] text-white/25">{entry.city}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-white/60 block">{entry.total_clicks}</span>
                    <span className="text-[10px] text-white/25">{t('echo.leaderboard.clicks')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
