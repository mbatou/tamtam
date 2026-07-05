"use client";

import CodeBlock from "@/components/developers/CodeBlock";
import ApiParam from "@/components/developers/ApiParam";
import EndpointBadge from "@/components/developers/EndpointBadge";
import { useTranslation } from "@/lib/i18n";

export default function ApiReference() {
  const { t } = useTranslation();
  return (
    <section id="api" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.api.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">{t("developers.api.title")}</h2>

        {/* Base URL */}
        <div className="mb-8">
          <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">{t("developers.api.baseUrl")}</h3>
          <code className="text-[14px] font-code text-[#79C0FF] bg-[#0D1117] px-4 py-2.5 rounded-lg border border-white/[0.07] block">
            https://tamma.me/api/pixel
          </code>
        </div>

        {/* Auth */}
        <div className="mb-12">
          <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">{t("developers.api.auth")}</h3>
          <code className="text-[13px] font-code text-white/60 bg-[#0D1117] px-4 py-2.5 rounded-lg border border-white/[0.07] block">
            X-Tamtam-Key: tmsk_your_key_here
          </code>
          <p className="text-[12px] font-dm text-white/35 mt-2">
            {t("developers.api.authDesc")}
          </p>
        </div>

        {/* Pixel ID vs tm_ref distinction */}
        <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-5 mb-12">
          <h3 className="text-[13px] font-dm font-semibold text-white mb-4">{t("developers.api.pixelVsTmrefTitle")}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[rgba(211,84,0,0.06)] border border-[rgba(211,84,0,0.15)] rounded-lg p-4">
              <code className="text-[12px] font-code text-[#D35400] font-bold">tmsk_...</code>
              <p className="text-[11px] font-dm font-semibold text-white/60 mt-2 mb-1">{t("developers.api.pixelIdLabel")}</p>
              <p className="text-[11px] font-dm text-white/35 leading-relaxed">
                {t("developers.api.pixelIdDesc")}
              </p>
            </div>
            <div className="bg-[rgba(29,158,117,0.06)] border border-[rgba(29,158,117,0.15)] rounded-lg p-4">
              <code className="text-[12px] font-code text-[#1D9E75] font-bold">tm_ref</code>
              <p className="text-[11px] font-dm font-semibold text-white/60 mt-2 mb-1">{t("developers.api.tmRefLabel")}</p>
              <p className="text-[11px] font-dm text-white/35 leading-relaxed">
                {t("developers.api.tmRefDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Endpoint 1 */}
        <div className="mb-12">
          <EndpointBadge method="POST" path="/api/pixel/event" />
          <p className="text-[13px] font-dm text-white/45 mt-3 mb-6">{t("developers.api.endpoint1Desc")}</p>

          {/* Headers table */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mb-3">{t("developers.api.headersLabel")}</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-4 mb-6">
            <ApiParam name="X-Tamtam-Key" type="string" required description={t("developers.api.paramPixelKey")} />
            <ApiParam name="Content-Type" type="string" required description={t("developers.api.paramContentType")} />
          </div>

          {/* Body params */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mb-3">{t("developers.api.bodyLabel")}</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-4 mb-6">
            <ApiParam name="event" type="string" required description={t("developers.api.paramEvent")} />
            <ApiParam name="tm_ref" type="string" description={t("developers.api.paramTmRef")} />
            <ApiParam name="value" type="number" description={t("developers.api.paramValue")} />
            <ApiParam name="currency" type="string" description={t("developers.api.paramCurrency")} />
            <ApiParam name="event_id" type="string" description={t("developers.api.paramEventId")} />
            <ApiParam name="user_data" type="object" description={t("developers.api.paramUserData")} />
          </div>

          {/* Request example */}
          <CodeBlock
            language="bash"
            filename={t("developers.api.requestExample")}
            code={`curl -X POST https://tamma.me/api/pixel/event \\
  -H "X-Tamtam-Key: tmsk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "sign_up",
    "tm_ref": "abc123xyz",
    "value": 1,
    "currency": "XOF",
    "event_id": "signup_user_456"
  }'`}
          />

          {/* Response */}
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-[11px] font-dm text-[#1D9E75] font-semibold mb-2">{t("developers.api.successLabel")}</p>
              <CodeBlock
                language="json"
                code={`{
  "success": true,
  "event_id": "evt_01HXYZ...",
  "received_at": "2026-05-24T14:30:00.000Z",
  "attribution": {
    "campaign_id": "camp_789",
    "echo_id": "echo_012"
  }
}`}
              />
            </div>
            <div>
              <p className="text-[11px] font-dm text-red-400 font-semibold mb-2">{t("developers.api.errorLabel")}</p>
              <CodeBlock
                language="json"
                code={`{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "API key not found or inactive."
}`}
              />
            </div>
          </div>

          {/* Error codes */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mt-8 mb-3">{t("developers.api.errorCodesLabel")}</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl overflow-hidden">
            <table className="w-full text-[12px] font-dm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">{t("developers.api.errorCodeHeader")}</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">{t("developers.api.errorHttpHeader")}</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">{t("developers.api.errorDescHeader")}</th>
                </tr>
              </thead>
              <tbody className="text-white/45">
                {[
                  ["INVALID_API_KEY", "401", t("developers.api.errorInvalidKey")],
                  ["RATE_LIMIT_EXCEEDED", "429", t("developers.api.errorRateLimit")],
                  ["PAYLOAD_TOO_LARGE", "413", t("developers.api.errorPayloadLarge")],
                  ["MISSING_EVENT", "400", t("developers.api.errorMissingEvent")],
                  ["CAMPAIGN_NOT_FOUND", "404", t("developers.api.errorCampaignNotFound")],
                ].map(([code, http, desc]) => (
                  <tr key={code} className="border-b border-white/[0.03] last:border-b-0">
                    <td className="px-4 py-2.5 font-code text-[#FF7B72]">{code}</td>
                    <td className="px-4 py-2.5 font-code">{http}</td>
                    <td className="px-4 py-2.5">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Endpoint 2 */}
        <div className="mb-12">
          <EndpointBadge method="GET" path="/api/pixel/ping" />
          <p className="text-[13px] font-dm text-white/45 mt-3 mb-4">{t("developers.api.endpoint2Desc")}</p>
          <CodeBlock
            language="bash"
            code={`curl https://tamma.me/api/pixel/ping
# → { "status": "ok", "version": "1.0", "timestamp": "..." }`}
          />
        </div>

        {/* Standard events */}
        <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">{t("developers.api.standardEventsLabel")}</h3>
        <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl overflow-hidden">
          <table className="w-full text-[12px] font-dm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">{t("developers.api.eventHeader")}</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">{t("developers.api.eventDescHeader")}</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold hidden sm:table-cell">{t("developers.api.eventUseHeader")}</th>
              </tr>
            </thead>
            <tbody className="text-white/45">
              {[
                ["page_view", t("developers.api.eventPageView"), t("developers.api.eventPageViewUse")],
                ["sign_up", t("developers.api.eventSignUp"), t("developers.api.eventSignUpUse")],
                ["activation", t("developers.api.eventActivation"), t("developers.api.eventActivationUse")],
                ["purchase", t("developers.api.eventPurchase"), t("developers.api.eventPurchaseUse")],
                ["lead", t("developers.api.eventLead"), t("developers.api.eventLeadUse")],
                ["app_install", t("developers.api.eventAppInstall"), t("developers.api.eventAppInstallUse")],
              ].map(([event, desc, use]) => (
                <tr key={event} className="border-b border-white/[0.03] last:border-b-0">
                  <td className="px-4 py-2.5 font-code text-[#A5D6FF]">{event}</td>
                  <td className="px-4 py-2.5">{desc}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-white/30">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] font-dm text-white/25 mt-2">
          {t("developers.api.customEventsNote")}
        </p>
      </div>
    </section>
  );
}
