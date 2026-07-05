"use client";

import { AlertCircle } from "lucide-react";
import CodeBlock from "@/components/developers/CodeBlock";
import TabGroup from "@/components/developers/TabGroup";
import { useTranslation } from "@/lib/i18n";

export default function CodeExamples() {
  const { t } = useTranslation();
  return (
    <section id="examples" className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.examples.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          {t("developers.examples.title")}
        </h2>

        <TabGroup
          tabs={[
            {
              label: t("developers.examples.tabEcommerce"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabEcommerceDesc")}
                  </p>
                  <CodeBlock
                    language="js"
                    filename="pages/order/confirmation.js"
                    code={`// Fire on page load after successful order
useEffect(() => {
  if (order.status === 'confirmed') {
    window.tamtam('track', 'purchase', {
      value: order.total_xof,
      currency: 'XOF',
      event_id: \`order_\${order.id}\`, // prevents duplicate counting on refresh
    })
  }
}, [order])`}
                  />
                </div>
              ),
            },
            {
              label: t("developers.examples.tabMobile"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabMobileDesc")}
                  </p>
                  <CodeBlock
                    language="python"
                    filename="tracking.py"
                    code={`import requests
import os

def track_tamtam_event(event_name, tm_ref, value=None):
    response = requests.post(
        'https://tamma.me/api/pixel/event',
        headers={
            'X-Tamtam-Key': os.environ['TAMTAM_PIXEL_KEY'],
            'Content-Type': 'application/json',
        },
        json={
            'event': event_name,
            'tm_ref': tm_ref,
            'value': value,
            'currency': 'XOF',
        }
    )
    return response.json()

# Call on user signup:
track_tamtam_event('sign_up', request.GET.get('tm_ref'), value=1)

# Call on first order:
track_tamtam_event('activation', session.get('tm_ref'), value=order.total)`}
                  />
                </div>
              ),
            },
            {
              label: t("developers.examples.tabLeadGen"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabLeadGenDesc")}
                  </p>
                  <CodeBlock
                    language="js"
                    filename="form-handler.js"
                    code={`// Vanilla JS — works on any website or landing page builder
document.getElementById('lead-form').addEventListener('submit', function(e) {
  e.preventDefault()

  // Submit your form first
  submitForm().then(() => {
    // Then fire the Pixel
    tamtam('track', 'lead', {
      value: 1,
      currency: 'XOF',
      event_id: \`lead_\${Date.now()}\`,
    })

    // Redirect to thank you page
    window.location.href = '/merci'
  })
})`}
                  />
                </div>
              ),
            },
            {
              label: t("developers.examples.tabSaas"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabSaasDesc")}
                  </p>
                  <CodeBlock
                    language="ts"
                    filename="app/api/onboarding/complete/route.ts"
                    code={`import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId, tmRef } = await req.json()

  // Your onboarding logic here...
  await completeOnboarding(userId)

  // Fire Pixel server-side
  await fetch('https://tamma.me/api/pixel/event', {
    method: 'POST',
    headers: {
      'X-Tamtam-Key': process.env.TAMTAM_PIXEL_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'activation',
      tm_ref: tmRef,
      value: 1,
      currency: 'XOF',
      event_id: \`activation_\${userId}\`,
    }),
  })

  return NextResponse.json({ success: true })
}`}
                  />
                </div>
              ),
            },
            {
              label: t("developers.examples.tabReactNative"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabReactNativeDesc")}
                  </p>
                  <CodeBlock
                    language="ts"
                    filename="utils/tamtam.ts"
                    code={`import { Linking } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// On app launch — capture tm_ref from deep link
export async function captureTmRef() {
  const url = await Linking.getInitialURL()
  if (url) {
    const tmRef = new URL(url).searchParams.get('tm_ref')
    if (tmRef) {
      await AsyncStorage.setItem('tm_ref', tmRef)
      await AsyncStorage.setItem('tm_ref_ts', Date.now().toString())
    }
  }
}

// On conversion — send event with stored tm_ref
export async function trackTamtam(event: string, value?: number) {
  const tmRef = await AsyncStorage.getItem('tm_ref')
  const ts = parseInt((await AsyncStorage.getItem('tm_ref_ts')) || '0')
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  // Expire after 7 days
  if (!tmRef || Date.now() - ts > SEVEN_DAYS) return

  await fetch('https://tamma.me/api/pixel/event', {
    method: 'POST',
    headers: {
      'X-Tamtam-Key': 'tmsk_your_key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      tm_ref: tmRef,
      value,
      currency: 'XOF',
    }),
  })
}

// Usage:
// captureTmRef()          — call in App.tsx useEffect
// trackTamtam('sign_up')  — call after registration`}
                  />
                </div>
              ),
            },
            {
              label: t("developers.examples.tabMobileWeb"),
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    {t("developers.examples.tabMobileWebDesc")}
                  </p>
                  <CodeBlock
                    language="js"
                    filename="tm-ref-persist.js"
                    code={`// Run on every page load — persist tm_ref across navigations
(function() {
  const params = new URLSearchParams(window.location.search)
  const tmRef = params.get('tm_ref')

  if (tmRef) {
    localStorage.setItem('tm_ref', tmRef)
    localStorage.setItem('tm_ref_ts', Date.now().toString())
  }
})()

// Helper: read stored tm_ref with 7-day expiry
function getTmRef() {
  const ref = localStorage.getItem('tm_ref')
  const ts = parseInt(localStorage.getItem('tm_ref_ts') || '0')
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  if (ref && Date.now() - ts < SEVEN_DAYS) return ref

  // Expired — clean up
  localStorage.removeItem('tm_ref')
  localStorage.removeItem('tm_ref_ts')
  return null
}

// On conversion, pass tm_ref explicitly
tamtam('track', 'sign_up', {
  tm_ref: getTmRef(),
  value: 1,
})`}
                  />
                  <div className="flex items-start gap-3 bg-[rgba(211,84,0,0.08)] border border-[rgba(211,84,0,0.2)] rounded-[10px] px-4 py-3 mt-4">
                    <AlertCircle className="w-4 h-4 text-[#F0997B] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-white/60 font-dm">
                      {t("developers.examples.tabMobileWebWarning")}
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
