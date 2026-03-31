import type { CityStats } from "../types";

interface CityPerformanceCardProps {
  cityStats: CityStats[];
}

export function CityPerformanceCard({ cityStats }: CityPerformanceCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">Performance par ville</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase">
              <th className="text-left py-2">Ville</th>
              <th className="text-center py-2">&Eacute;chos</th>
              <th className="text-center py-2">Clics valides</th>
              <th className="text-center py-2">Taux validit&eacute;</th>
              <th className="text-center py-2">Clics/&Eacute;cho</th>
            </tr>
          </thead>
          <tbody>
            {cityStats.map((city) => (
              <tr key={city.city} className="border-t border-gray-800">
                <td className="py-3 text-white">{city.city}</td>
                <td className="py-3 text-center">{city.echoCount}</td>
                <td className="py-3 text-center text-green-400">{city.validClicks}</td>
                <td className="py-3 text-center">
                  <span className={city.validRate >= 55 ? "text-green-400" : city.validRate >= 40 ? "text-yellow-400" : "text-red-400"}>
                    {city.validRate}%
                  </span>
                </td>
                <td className="py-3 text-center text-gray-400">{city.clicksPerEcho}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
