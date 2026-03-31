import type { Suggestion } from "../types";

interface SuggestionsSectionProps {
  suggestions: Suggestion[];
}

export function SuggestionsSection({ suggestions }: SuggestionsSectionProps) {
  return (
    <div className="space-y-3 mb-8">
      {suggestions.map((s, i) => (
        <div key={i} className={`rounded-xl p-4 border ${
          s.severity === "red" ? "bg-red-500/10 border-red-500/30" :
          s.severity === "yellow" ? "bg-yellow-500/10 border-yellow-500/30" :
          "bg-green-500/10 border-green-500/30"
        }`}>
          <div className={`text-sm ${
            s.severity === "red" ? "text-red-400" :
            s.severity === "yellow" ? "text-yellow-400" :
            "text-green-400"
          }`}>
            {s.severity === "red" ? "\u{1F534}" : s.severity === "yellow" ? "\u{1F7E1}" : "\u{1F7E2}"} {s.text}
          </div>
        </div>
      ))}
    </div>
  );
}
