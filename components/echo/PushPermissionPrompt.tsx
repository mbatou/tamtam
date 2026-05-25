'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface PushPermissionPromptProps {
  onEnabled: () => void
  onSkip: () => void
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushPermissionPrompt({ onEnabled, onSkip }: PushPermissionPromptProps) {
  const { t } = useTranslation()
  const [subscribing, setSubscribing] = useState(false)

  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return null

  async function handleEnable() {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        onSkip()
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ),
      })

      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      onEnabled()
    } catch (err) {
      console.error('[Push]', err)
      onSkip()
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="rounded-2xl bg-[#D35400]/5 border border-[#D35400]/20 p-5 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D35400]/10 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-[#D35400]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold font-syne text-[#D35400] mb-1">
            {t('echo.push.title')}
          </h3>
          <p className="text-xs text-white/40 mb-4">
            {t('echo.push.body')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="flex-1 py-2.5 rounded-xl bg-[#D35400] hover:bg-[#B84800] text-white text-xs font-bold transition disabled:opacity-50"
            >
              {subscribing ? '...' : t('echo.push.enable')}
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:bg-white/10 transition"
            >
              {t('echo.push.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
