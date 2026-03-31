import type { WebAnalyticsData } from "../types";

interface WebAnalyticsCardProps {
  webAnalytics: WebAnalyticsData | null;
  loading: boolean;
}

export function WebAnalyticsCard({ webAnalytics, loading }: WebAnalyticsCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">{"\u{1F310}"} Activit&eacute; plateforme (30 jours)</h2>

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : webAnalytics?.error ? (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="text-orange-400 text-sm font-medium">{"\u26A0\uFE0F"} Erreur de chargement</div>
          <div className="text-gray-500 text-xs mt-1">{webAnalytics.error}</div>
        </div>
      ) : webAnalytics?.summary ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Clics totaux</div>
              <div className="text-white font-bold text-lg">{webAnalytics.summary.totalClicks.toLocaleString("fr-FR")}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Clics valides</div>
              <div className="text-green-400 font-bold text-lg">{webAnalytics.summary.validClicks.toLocaleString("fr-FR")}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Taux fraude</div>
              <div className={`font-bold text-lg ${webAnalytics.summary.fraudRate > 20 ? "text-red-400" : webAnalytics.summary.fraudRate > 10 ? "text-yellow-400" : "text-green-400"}`}>
                {webAnalytics.summary.fraudRate}%
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Inscriptions</div>
              <div className="text-white font-bold text-lg">{webAnalytics.summary.totalSignups.toLocaleString("fr-FR")}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">&Eacute;chos inscrits</div>
              <div className="text-blue-400 font-bold text-lg">{webAnalytics.summary.echoSignups.toLocaleString("fr-FR")}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Marques inscrites</div>
              <div className="text-purple-400 font-bold text-lg">{webAnalytics.summary.brandSignups.toLocaleString("fr-FR")}</div>
            </div>
          </div>

          {/* Daily Clicks Trend */}
          {webAnalytics.clicksTrend?.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-3">Clics par jour</h3>
              <div className="flex items-end gap-[2px] h-24">
                {webAnalytics.clicksTrend.map((day, i) => {
                  const maxVal = Math.max(...webAnalytics.clicksTrend.map(d => d.total), 1);
                  const height = Math.max((day.total / maxVal) * 100, 2);
                  const validHeight = Math.max((day.valid / maxVal) * 100, 0);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {day.date.slice(5)}: {day.total} clics ({day.valid} valides)
                      </div>
                      <div className="w-full rounded-t" style={{ height: `${height}%`, backgroundColor: "rgba(107, 114, 128, 0.5)" }}>
                        <div className="w-full rounded-t bg-green-500/70" style={{ height: `${(validHeight / height) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-gray-600 text-xs mt-1">
                <span>{webAnalytics.clicksTrend[0]?.date.slice(5)}</span>
                <span>{webAnalytics.clicksTrend[webAnalytics.clicksTrend.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Top Campaigns */}
            {webAnalytics.topCampaigns?.length > 0 && (
              <div>
                <h3 className="text-gray-400 text-sm font-medium mb-3">Top campagnes (clics valides)</h3>
                <div className="space-y-2">
                  {webAnalytics.topCampaigns.map((campaign, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm truncate flex-1">{campaign.title}</span>
                      <span className="text-green-400 font-medium text-sm ml-4">
                        {campaign.clicks.toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hour Distribution */}
            {webAnalytics.hourDistribution && (
              <div>
                <h3 className="text-gray-400 text-sm font-medium mb-3">Distribution horaire des clics</h3>
                <div className="flex items-end gap-[1px] h-16">
                  {webAnalytics.hourDistribution.map((count, hour) => {
                    const maxVal = Math.max(...webAnalytics.hourDistribution, 1);
                    const height = Math.max((count / maxVal) * 100, 2);
                    return (
                      <div key={hour} className="flex-1 group relative flex items-end justify-center h-full">
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {hour}h: {count} clics
                        </div>
                        <div className="w-full rounded-t bg-blue-500/60" style={{ height: `${height}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-gray-600 text-xs mt-1">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>23h</span>
                </div>
              </div>
            )}
          </div>

          {/* Daily Signups Trend */}
          {webAnalytics.signupsTrend?.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-3">Inscriptions par jour</h3>
              <div className="flex items-end gap-[2px] h-16">
                {webAnalytics.signupsTrend.map((day, i) => {
                  const maxVal = Math.max(...webAnalytics.signupsTrend.map(d => d.echos + d.brands), 1);
                  const height = Math.max(((day.echos + day.brands) / maxVal) * 100, 2);
                  return (
                    <div key={i} className="flex-1 group relative flex items-end justify-center h-full">
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {day.date.slice(5)}: {day.echos} &eacute;chos, {day.brands} marques
                      </div>
                      <div className="w-full rounded-t bg-purple-500/60" style={{ height: `${height}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-gray-600 text-xs mt-1">
                <span>{webAnalytics.signupsTrend[0]?.date.slice(5)}</span>
                <span>{webAnalytics.signupsTrend[webAnalytics.signupsTrend.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Aucune donn&eacute;e disponible.</div>
      )}
    </div>
  );
}
