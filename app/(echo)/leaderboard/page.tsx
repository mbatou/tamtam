'use client'

import { useState, useEffect } from 'react'
import { Loader2, ArrowLeft } from 'lucide-react'
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

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
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
      .then(res => res.ok ? res.json() : { leaderboard: [], userRank: null })
      .then(data => {
        setEntries(data.leaderboard || [])
        setUserRank(data.userRank)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [period, currentUserId])

  const medals = ['', '🥇', '🥈', '🥉']

  return (
    <div className="px-4 py-5 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <h1 className="text-xl font-bold font-syne">{t('echo.leaderboard.title')}</h1>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setPeriod('weekly')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
            period === 'weekly'
              ? 'bg-[#1D9E75] text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          {t('echo.leaderboard.weekly')}
        </button>
        <button
          onClick={() => setPeriod('monthly')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
            period === 'monthly'
              ? 'bg-[#1D9E75] text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          {t('echo.leaderboard.monthly')}
        </button>
      </div>

      {userRank && userRank > 20 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-between">
          <span className="text-xs text-[#1D9E75] font-semibold">
            {t('echo.leaderboard.yourRank')}: #{userRank}
          </span>
        </div>
      )}

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
                        <span className="text-xs" title="Écho Fondateur">&#129351;</span>
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
