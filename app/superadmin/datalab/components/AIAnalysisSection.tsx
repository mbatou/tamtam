"use client";

import type { AIAnalysis } from "../types";
import { LAW_ICONS, LAW_COLORS } from "../constants";

interface AIAnalysisSectionProps {
  aiAnalysis: AIAnalysis | null;
  analyzing: boolean;
  aiError: string | null;
  onAnalyze: () => void;
}

export function AIAnalysisSection({ aiAnalysis, analyzing, aiError, onAnalyze }: AIAnalysisSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          {"\u{1F9E0}"} Analyse Comportementale IA
        </h2>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 ${
            analyzing
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          {analyzing ? (
            <>
              <span className="animate-spin">{"\u{1F52C}"}</span>
              Analyse en cours...
            </>
          ) : aiAnalysis ? (
            <>{"\u{1F504}"} Relancer l&apos;analyse</>
          ) : (
            <>{"\u{1F52C}"} Analyser les donn&eacute;es</>
          )}
        </button>
      </div>

      {/* Loading state */}
      {analyzing && (
        <div className="bg-card rounded-xl p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">{"\u{1F9E0}"}</div>
          <div className="text-white font-medium">Le scientifique analyse vos donn&eacute;es...</div>
          <div className="text-gray-500 text-sm mt-2">Application des lois comportementales de Bartlett + m&eacute;triques Uber Lab</div>
          <div className="flex justify-center gap-2 mt-4">
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Peak-End Rule</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Idleness Aversion</span>
            <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded">Goal-Gradient</span>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">Glass Box</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">Uncertainty</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="text-red-400 font-medium">{"\u274C"} {aiError}</div>
          <div className="text-gray-500 text-sm mt-1">V&eacute;rifiez la cl&eacute; API Anthropic dans les variables d&apos;environnement.</div>
        </div>
      )}

      {/* AI Results */}
      {aiAnalysis && !analyzing && (
        <div className="space-y-4">
          {/* Summary + top priority */}
          <div className="bg-card rounded-xl p-6 border border-orange-500/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{"\u{1F9E0}"}</span>
              <div>
                <div className="text-white font-medium mb-2">{aiAnalysis.summary}</div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                  <div className="text-orange-400 text-xs uppercase tracking-wider mb-1">Priorit&eacute; #1 cette semaine</div>
                  <div className="text-white text-sm font-medium">{aiAnalysis.topPriority}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Individual insights */}
          {aiAnalysis.insights.map((insight, i) => (
            <div key={i} className={`rounded-xl p-5 border ${
              insight.severity === "red" ? "border-red-500/30 bg-red-500/5" :
              insight.severity === "yellow" ? "border-yellow-500/30 bg-yellow-500/5" :
              "border-green-500/30 bg-green-500/5"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${
                    insight.severity === "red" ? "text-red-400" :
                    insight.severity === "yellow" ? "text-yellow-400" :
                    "text-green-400"
                  }`}>
                    {insight.severity === "red" ? "\u{1F534}" : insight.severity === "yellow" ? "\u{1F7E1}" : "\u{1F7E2}"}
                  </span>
                  <h3 className="text-white font-bold text-sm">{insight.title}</h3>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${LAW_COLORS[insight.law] || "border-gray-500/30 bg-gray-500/5"}`}>
                  {LAW_ICONS[insight.law] || "\u{1F4CA}"} {insight.law}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Observation</div>
                  <div className="text-gray-300">{insight.observation}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Psychologie</div>
                  <div className="text-gray-400 italic">{insight.psychology}</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Action recommand&eacute;e</div>
                    <div className="text-white">{insight.action}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Impact</div>
                    <div className="text-green-400 text-sm font-medium">{insight.impact}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Cost indicator */}
          <div className="text-center text-gray-600 text-xs mt-2">
            Analyse effectu&eacute;e via Claude Sonnet &middot; ~0,01 USD par analyse
          </div>
        </div>
      )}

      {/* Initial state — no analysis yet */}
      {!aiAnalysis && !analyzing && !aiError && (
        <div className="bg-card rounded-xl p-6 border border-dashed border-gray-700 text-center">
          <div className="text-3xl mb-3">{"\u{1F9E0}"}</div>
          <div className="text-white font-medium mb-1">Analyse comportementale IA</div>
          <div className="text-gray-500 text-sm mb-4">
            Le scientifique analysera vos donn&eacute;es &agrave; travers les lois de Bartlett et les m&eacute;triques Uber Lab
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">{"\u{1F3D4}\uFE0F"} Peak-End Rule</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{"\u23F3"} Idleness Aversion</span>
            <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded">{"\u{1F3AF}"} Goal-Gradient</span>
            <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">{"\u{1F50D}"} Glass Box</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">{"\u{1F6E1}\uFE0F"} Uncertainty Reduction</span>
          </div>
        </div>
      )}
    </div>
  );
}
