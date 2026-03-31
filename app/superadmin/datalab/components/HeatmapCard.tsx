interface HeatmapCardProps {
  heatmap: number[][];
}

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function HeatmapCard({ heatmap }: HeatmapCardProps) {
  const maxCount = Math.max(...heatmap.flat());

  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">Heures de pointe</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-500 py-1 w-16"></th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="text-center text-gray-600 py-1 w-8">{h}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={d}>
                <td className="text-gray-500 py-1">{day}</td>
                {heatmap[d].map((count: number, h: number) => {
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  return (
                    <td key={h} className="py-1 px-0.5">
                      <div className="w-6 h-6 rounded-sm mx-auto" style={{
                        background: intensity > 0.7 ? "#D35400" :
                                   intensity > 0.4 ? "#E67E22" :
                                   intensity > 0.1 ? "#2a2a3a" :
                                   "#1a1a2e",
                      }} title={`${day} ${h}h: ${count} clics`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#1a1a2e" }}></span> 0</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#2a2a3a" }}></span> Faible</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#E67E22" }}></span> Moyen</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#D35400" }}></span> Fort</span>
      </div>
    </div>
  );
}
