import type { Cohort } from "../types";

interface RetentionCohortsCardProps {
  cohorts: Cohort[];
}

export function RetentionCohortsCard({ cohorts }: RetentionCohortsCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">R&eacute;tention par cohorte</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase">
              <th className="text-left py-2">Cohorte</th>
              <th className="text-center py-2">Inscrits</th>
              <th className="text-center py-2">Actifs auj.</th>
              <th className="text-center py-2">R&eacute;tention</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.week} className="border-t border-gray-800">
                <td className="py-3 text-white">{c.week}</td>
                <td className="py-3 text-center">{c.registered}</td>
                <td className="py-3 text-center text-green-400">{c.activeNow}</td>
                <td className="py-3 text-center">
                  <span className={c.retentionRate >= 30 ? "text-green-400" : c.retentionRate >= 15 ? "text-yellow-400" : "text-red-400"}>
                    {c.retentionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
