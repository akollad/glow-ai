/**
 * Amazon Bedrock — Mistral Large via bearer-token API key
 *
 * Auth: AWS_BEARER_TOKEN_BEDROCK env var (bearer token, no AWS credentials needed)
 * Region: AWS_REGION env var (default: us-east-1)
 * Model: BEDROCK_MODEL_ID env var (default: mistral.mistral-large-2402-v1:0)
 *
 * Uses the Bedrock Converse API via direct HTTP — the bearer-token auth is
 * explicitly supported through the Authorization: Bearer header.
 */

import { logger } from "./logger";
import type { SkinMetrics } from "./youcam";

const API_KEY = process.env.AWS_BEARER_TOKEN_BEDROCK;
const REGION = process.env.AWS_REGION ?? "us-east-1";
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "mistral.mistral-large-2402-v1:0";

function buildPrompt(metrics: SkinMetrics): string {
  const score = (v: number) => `${v}/100`;

  const undertoneLabel: Record<string, string> = {
    warm: "chaude (dorée/pêche)",
    cool: "froide (rosée/bleutée)",
    neutral: "neutre",
    golden: "dorée profonde",
  };

  const skinTypeLabel: Record<string, string> = {
    Dry: "sèche",
    Oily: "grasse",
    Combination: "mixte",
    Normal: "normale",
  };

  const undertone = metrics.undertone
    ? (undertoneLabel[metrics.undertone] ?? metrics.undertone)
    : "non déterminée";

  const skinType = metrics.skinType
    ? (skinTypeLabel[metrics.skinType] ?? metrics.skinType)
    : "non déterminé";

  return `Tu es Glow AI, un dermatologue virtuel spécialisé dans les peaux riches en mélanine (types Fitzpatrick IV–VI). Tu parles uniquement en français, avec un ton chaleureux et expert — ni alarmiste ni condescendant.

Voici les résultats d'analyse cutanée d'une utilisatrice :

**Profil général**
- Score global : ${score(metrics.overallScore)}
- Type de peau : ${skinType}
- Sous-ton : ${undertone}
- Âge cutané estimé : ${metrics.skinAge ?? "non déterminé"} ans

**Analyse détaillée (sur 100)**
| Paramètre | Score |
|---|---|
| Hydratation | ${score(metrics.hydrationScore)} |
| Sébum / brillance | ${score(metrics.oilinessScore)} |
| Fermeté | ${score(metrics.firmnessScore)} |
| Éclat / radiance | ${score(metrics.radianceScore)} |
| Rougeurs | ${score(metrics.rednessScore)} |
| Acné / imperfections | ${score(metrics.acneScore)} |
| Pores dilatés | ${score(metrics.poresScore)} |
| Rides & ridules | ${score(metrics.wrinklesScore)} |
| Taches de pigmentation | ${score(metrics.pigmentationScore)} |
| Cernes | ${score(metrics.darkcirclesScore)} |
| Poches sous les yeux | ${score(metrics.eyeBagScore)} |
| Vallées lacrymales | ${score(metrics.tearTroughScore)} |
| Ptosis paupière inférieure | ${score(metrics.droopyLowerEyelidScore)} |
| Ptosis paupière supérieure | ${score(metrics.droopyUpperEyelidScore)} |

**Génère une réponse structurée avec exactement ces 4 sections :**

## 🌟 Diagnostic personnalisé
Un paragraphe de 3-4 phrases qui résume l'état de la peau de manière bienveillante. Mentionne les points forts et les axes d'amélioration. Adapte le ton au score global.

## ☀️ Routine Matin
Une liste ordonnée de 4-5 étapes avec les actifs précis (ex : "Nettoyant doux sans sulfate → Sérum vitamine C 10-15% → …"). Pour chaque étape, une courte phrase d'explication. Adapte aux scores les plus faibles.

## 🌙 Routine Soir
Une liste ordonnée de 4-5 étapes avec les actifs précis. Inclus les traitements ciblés selon les problématiques détectées (acné, pigmentation, rides, etc.).

## ⚠️ Points d'attention peaux mélanisées
2-3 conseils spécifiques aux peaux foncées : risques de post-inflammation hyperpigmentée (PIH), actifs à éviter ou à adapter (ex : acide glycolique > 10% sans accoutumance, certains rétinoïdes), importance du SPF même pour les peaux foncées.

Sois concis, actionnable et précis. N'invente pas d'information médicale. Maximum 400 mots au total.`;
}

/**
 * Generate a personalized AI skin-care advice using Mistral via Amazon Bedrock.
 * Falls back to a short rule-based summary if Bedrock is unavailable.
 */
export async function generateAiAdvice(metrics: SkinMetrics): Promise<string> {
  if (!API_KEY) {
    logger.warn("AWS_BEARER_TOKEN_BEDROCK not set — using rule-based fallback");
    return generateFallback(metrics);
  }

  const endpoint = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/converse`;

  try {
    const body = {
      messages: [
        {
          role: "user",
          content: [{ text: buildPrompt(metrics) }],
        },
      ],
      inferenceConfig: {
        maxTokens: 1200,
        temperature: 0.65,
        topP: 0.9,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ status: res.status, body: errText }, "Bedrock API error");
      return generateFallback(metrics);
    }

    const json = (await res.json()) as {
      output?: { message?: { content?: Array<{ text?: string }> } };
    };

    const text =
      json.output?.message?.content?.[0]?.text?.trim() ?? "";

    if (!text) {
      logger.warn("Bedrock returned empty content — falling back");
      return generateFallback(metrics);
    }

    logger.info({ model: MODEL_ID }, "Bedrock AI advice generated");
    return text;
  } catch (err) {
    logger.error({ err }, "Bedrock call failed — falling back");
    return generateFallback(metrics);
  }
}

/** Simple rule-based fallback used when Bedrock is unavailable */
function generateFallback(metrics: SkinMetrics): string {
  const lines: string[] = [];

  if (metrics.overallScore >= 80) {
    lines.push(
      `Votre peau est en excellente santé avec un score de ${metrics.overallScore}/100. Continuez votre routine!`,
    );
  } else if (metrics.overallScore >= 60) {
    lines.push(
      `Score peau : ${metrics.overallScore}/100. Votre peau se porte bien, mais il y a encore de la marge.`,
    );
  } else {
    lines.push(
      `Score peau : ${metrics.overallScore}/100. Votre peau mérite plus d'attention — voici comment l'aider.`,
    );
  }

  if (metrics.hydrationScore < 60)
    lines.push(
      "Hydratation insuffisante — sérum acide hyaluronique recommandé.",
    );
  if (metrics.pigmentationScore < 50)
    lines.push("Hyperpigmentation détectée — niacinamide + SPF 50+ essentiels.");
  if (metrics.acneScore < 60)
    lines.push("Imperfections visibles — nettoyant à l'acide salicylique le soir.");
  if (metrics.radianceScore < 50)
    lines.push("Manque d'éclat — vitamine C matin + exfoliation douce 1×/semaine.");

  return lines.join(" ");
}
