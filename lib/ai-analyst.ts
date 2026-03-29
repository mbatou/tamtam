const DATALAB_SYSTEM_PROMPT = `Tu es le Chief Behavioral Scientist de Tamtam, une plateforme de marketing WhatsApp Status au Sénégal. Tu analyses les données de la plateforme à travers le prisme de la psychologie comportementale et de la science de la croissance.

TON CADRE D'ANALYSE COMBINE:

1. LES 5 MOONSHOTS PSYCHOLOGIQUES DE STEVEN BARTLETT (Diary of a CEO):

- Peak-End Rule: Les gens se souviennent du pic d'une expérience et de sa fin. Analyse: Quels sont les moments pics pour les Échos et les marques? La fin de l'expérience est-elle positive? Le retrait d'argent (la "fin") est-il fluide? Le moment où un Écho craque un œuf est-il mémorable?

- Idleness Aversion (Aversion à l'oisiveté): Les gens sont plus heureux quand ils sont occupés. Analyse: Les utilisateurs sont-ils parfois laissés sans rien à faire? Combien de temps entre deux campagnes? Les Échos qui visitent l'app sans campagne disponible — que vivent-ils?

- Goal-Gradient Effect (Effet de gradient d'objectif): Les gens accélèrent quand ils voient la ligne d'arrivée. Analyse: Montrons-nous la progression vers des objectifs? Les barres de progression (8/10 clics pour un œuf) fonctionnent-elles? Où pouvons-nous ajouter des indicateurs de progrès?

- Glass Box (Boîte de verre): La transparence construit la confiance. Analyse: Les utilisateurs peuvent-ils voir comment les choses fonctionnent? Où le processus est-il opaque? Les marques voient-elles en temps réel ce qui se passe avec leur campagne?

- Uncertainty Reduction (Réduction de l'incertitude): Réduire les inconnues réduit l'anxiété. Analyse: De quoi les nouveaux utilisateurs sont-ils incertains? Combien de temps avant qu'ils comprennent que la plateforme fonctionne? Un nouvel Écho qui n'a pas de campagne dans les 48h — que pense-t-il?

2. MÉTRIQUES COMPORTEMENTALES INSPIRÉES D'UBER LAB:

- Activation: Temps jusqu'au premier moment de valeur (premier clic, premier gain)
- Rétention: Par cohorte, pas juste DAU/MAU
- Boucles d'engagement: Qu'est-ce qui déclenche l'usage répété?
- Analyse des power users: Qui sont les utilisateurs vitaux? (règle 80/20)
- Prédiction de churn: Quels signaux précèdent le départ?
- Moments "Aha!": Quel est le moment où un utilisateur comprend la valeur?

3. TON FORMAT DE SORTIE:

Retourne EXACTEMENT un JSON valide (pas de markdown, pas de backticks) avec cette structure:
{
  "insights": [
    {
      "severity": "red" | "yellow" | "green",
      "title": "Titre court et percutant",
      "observation": "Ce que les données montrent (avec chiffres spécifiques)",
      "psychology": "Pourquoi c'est important (référence au principe psychologique)",
      "law": "Peak-End Rule" | "Idleness Aversion" | "Goal-Gradient" | "Glass Box" | "Uncertainty Reduction" | "Uber: Activation" | "Uber: Retention" | "Uber: Power Users" | "Uber: Churn",
      "action": "Action spécifique à implémenter (avec estimation effort: facile/moyen/difficile)",
      "impact": "Impact estimé sur la métrique clé"
    }
  ],
  "summary": "Résumé en 2-3 phrases de l'état de santé de la plateforme",
  "topPriority": "LA chose la plus importante à faire cette semaine"
}

Règles:
- Maximum 7 insights, minimum 3
- Sois spécifique avec les chiffres (pas "beaucoup d'Échos" mais "320 Échos sur 709")
- Chaque insight doit référencer un principe psychologique spécifique
- Les actions doivent être concrètes et réalisables
- Écris en français
- Retourne UNIQUEMENT du JSON valide, rien d'autre`;

export async function analyzeWithAI(metrics: {
  echoFunnel: { registered: number; acceptedCampaign: number; generatedClick: number; withdrew: number; activeWeek: number };
  echoLifecycle: { new: number; active: number; dormant: number; churned: number; neverActive: number };
  brandFunnel: { registered: number; recharged: number; launchedCampaign: number; repeatCampaign: number };
  heatmap: number[][];
  cityStats: { city: string; echoCount: number; validClicks: number; validRate: number; clicksPerEcho: number }[];
  campaignStats: { totalCampaigns: number; completedCampaigns: number; avgBudget: number; avgCPC: number };
  cohorts: { week: string; registered: number; activeNow: number; retentionRate: number }[];
  suggestions: { severity: string; text: string }[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const safe = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  const metricsText = `
DONNÉES PLATEFORME TAMTAM — ${new Date().toLocaleDateString("fr-FR")}

=== ENTONNOIR ÉCHO ===
Inscrits: ${metrics.echoFunnel.registered}
Campagne acceptée: ${metrics.echoFunnel.acceptedCampaign} (${safe(metrics.echoFunnel.acceptedCampaign, metrics.echoFunnel.registered)}%)
Premier clic: ${metrics.echoFunnel.generatedClick} (${safe(metrics.echoFunnel.generatedClick, metrics.echoFunnel.registered)}%)
Premier retrait: ${metrics.echoFunnel.withdrew} (${safe(metrics.echoFunnel.withdrew, metrics.echoFunnel.registered)}%)
Actifs 7 jours: ${metrics.echoFunnel.activeWeek} (${safe(metrics.echoFunnel.activeWeek, metrics.echoFunnel.registered)}%)

=== CYCLE DE VIE ÉCHO ===
Nouveaux (< 7j): ${metrics.echoLifecycle.new}
Actifs (7j): ${metrics.echoLifecycle.active}
Dormants (14j+): ${metrics.echoLifecycle.dormant}
Churnés (30j+): ${metrics.echoLifecycle.churned}
Jamais actifs: ${metrics.echoLifecycle.neverActive}

=== ENTONNOIR MARQUES ===
Inscrites: ${metrics.brandFunnel.registered}
Rechargé: ${metrics.brandFunnel.recharged}
1ère campagne: ${metrics.brandFunnel.launchedCampaign}
2+ campagnes: ${metrics.brandFunnel.repeatCampaign}

=== PERFORMANCE CAMPAGNES ===
Total campagnes: ${metrics.campaignStats.totalCampaigns}
Campagnes terminées: ${metrics.campaignStats.completedCampaigns}
Budget moyen: ${metrics.campaignStats.avgBudget} FCFA
CPC moyen: ${metrics.campaignStats.avgCPC} FCFA

=== RÉTENTION PAR COHORTE ===
${metrics.cohorts.map(c => `${c.week}: ${c.registered} inscrits → ${c.activeNow} actifs (${c.retentionRate}%)`).join("\n")}

=== PERFORMANCE PAR VILLE (top 5) ===
${metrics.cityStats.slice(0, 5).map(c => `${c.city}: ${c.echoCount} échos, ${c.validClicks} clics valides, ${c.validRate}% taux validité, ${c.clicksPerEcho} clics/écho`).join("\n")}

=== HEURES DE POINTE ===
${(() => {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const peaks: string[] = [];
  for (let d = 0; d < 7; d++) {
    const maxHour = metrics.heatmap[d].indexOf(Math.max(...metrics.heatmap[d]));
    const maxClicks = metrics.heatmap[d][maxHour];
    if (maxClicks > 0) peaks.push(`${days[d]}: pic à ${maxHour}h (${maxClicks} clics)`);
  }
  return peaks.join("\n");
})()}

=== ALERTES EXISTANTES ===
${metrics.suggestions.map(s => `${s.severity}: ${s.text}`).join("\n")}
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: DATALAB_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Analyse ces données et fournis tes insights comportementaux:\n\n${metricsText}`,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response (handle potential markdown wrapping)
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}
