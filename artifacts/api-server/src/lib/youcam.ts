// YouCam Perfect Corp AI API proxy
// Skin AI + Apparel VTO integration

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const YOUCAM_BASE_URL = "https://us-central1-perfect-corp-sdk.cloudfunctions.net";

export interface SkinMetrics {
  overallScore: number;
  acneScore: number;
  hydrationScore: number;
  pigmentationScore: number;
  poresScore: number;
  wrinklesScore: number;
  darkcirclesScore: number;
  radianceScore: number;
  undertone: string | null;
  skinType: string | null;
}

export interface ColorRecommendation {
  recommendedColors: string[];
  avoidColors: string[];
  necklineAdvice: string | null;
  styleAdvice: string | null;
}

function deriveColorRecommendation(metrics: SkinMetrics): ColorRecommendation {
  const { undertone, pigmentationScore, radianceScore } = metrics;

  let recommendedColors: string[] = [];
  let avoidColors: string[] = [];
  let necklineAdvice: string | null = null;
  let styleAdvice: string | null = null;

  // Undertone-based color recommendations
  if (undertone === "warm" || undertone === "golden") {
    recommendedColors = ["#C4622D", "#D4A853", "#8B6914", "#A0522D", "#CD853F", "#DAA520"];
    avoidColors = ["#FF6B6B", "#FF69B4", "#E91E63"];
    styleAdvice = "Les teintes terre et dorées subliment votre sous-ton chaud. Privilegiez l'orange brûlé, l'ocre et le doré.";
  } else if (undertone === "cool" || undertone === "pink") {
    recommendedColors = ["#4682B4", "#708090", "#8FBC8F", "#20B2AA", "#9370DB", "#DC143C"];
    avoidColors = ["#FFA500", "#FFD700", "#FFFF00"];
    styleAdvice = "Les tons froids et vibrants vous mettent en valeur — bleu marine, vert sauge, bordeaux profond.";
  } else {
    // Neutral undertone — versatile
    recommendedColors = ["#8B4513", "#A0522D", "#D2691E", "#CD853F", "#2F4F4F", "#556B2F"];
    avoidColors = [];
    styleAdvice = "Votre sous-ton neutre vous permet de porter presque toutes les couleurs. Expérimentez!";
  }

  // Pigmentation advice
  if (pigmentationScore < 50) {
    necklineAdvice = "Les cols montants et les encolures en V hautes détournent l'attention vers le regard.";
    avoidColors = [...avoidColors, "#FF0000"];
  }

  // Radiance boost advice
  if (radianceScore < 60) {
    styleAdvice = (styleAdvice ?? "") + " Évitez les couleurs ternes — un vêtement lumineux compensera le manque d'éclat.";
  }

  return { recommendedColors, avoidColors, necklineAdvice, styleAdvice };
}

function generateAiAdvice(metrics: SkinMetrics): string {
  const lines: string[] = [];

  if (metrics.overallScore >= 80) {
    lines.push(`Votre peau est en excellente santé avec un score de ${metrics.overallScore}/100. Continuez votre routine!`);
  } else if (metrics.overallScore >= 60) {
    lines.push(`Score peau : ${metrics.overallScore}/100. Votre peau se porte bien, mais il y a encore de la marge.`);
  } else {
    lines.push(`Score peau : ${metrics.overallScore}/100. Votre peau mérite plus d'attention — voici comment l'aider.`);
  }

  if (metrics.hydrationScore < 60) {
    lines.push("Hydratation insuffisante — cherchez un sérum à l'acide hyaluronique, pas une crème éclaircissante.");
  }

  if (metrics.pigmentationScore < 50) {
    lines.push("Hyperpigmentation détectée. Arrêtez les produits éclaircissants — votre peau a besoin de niacinamide et de protection solaire SPF 50+.");
  }

  if (metrics.acneScore < 60) {
    lines.push("Des imperfections sont visibles. Un nettoyant à l'acide salicylique utilisé le soir peut aider.");
  }

  if (metrics.radianceScore < 50) {
    lines.push("Votre peau manque d'éclat. La vitamine C sérum matin + exfoliation douce une fois par semaine feront la différence.");
  }

  return lines.join(" ");
}

// Simulated YouCam Skin AI response (replace with real API call once SDK access is confirmed)
export async function analyzeSkin(imageBase64: string): Promise<{ metrics: SkinMetrics; rawData: Record<string, unknown> }> {
  if (!YOUCAM_API_KEY) {
    throw new Error("YOUCAM_API_KEY is not configured");
  }

  // Attempt real YouCam API call
  try {
    const response = await fetch(`${YOUCAM_BASE_URL}/skinAnalysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": YOUCAM_API_KEY,
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      // Map YouCam API response to our metrics format
      const rawScores = (data.scores ?? {}) as Record<string, number>;
      const metrics: SkinMetrics = {
        overallScore: Math.round((rawScores.overall ?? 0) * 100),
        acneScore: Math.round((rawScores.acne ?? 0) * 100),
        hydrationScore: Math.round((rawScores.hydration ?? 0) * 100),
        pigmentationScore: Math.round((rawScores.pigmentation ?? 0) * 100),
        poresScore: Math.round((rawScores.pores ?? 0) * 100),
        wrinklesScore: Math.round((rawScores.wrinkles ?? 0) * 100),
        darkcirclesScore: Math.round((rawScores.dark_circles ?? 0) * 100),
        radianceScore: Math.round((rawScores.radiance ?? 0) * 100),
        undertone: (data.undertone as string | null) ?? null,
        skinType: (data.skin_type as string | null) ?? null,
      };
      return { metrics, rawData: data };
    }
  } catch {
    // Fall through to simulated response
  }

  // Simulated response for development / when API is unreachable
  const seed = imageBase64.length % 30;
  const metrics: SkinMetrics = {
    overallScore: 55 + seed,
    acneScore: 45 + (seed % 20),
    hydrationScore: 50 + (seed % 25),
    pigmentationScore: 40 + (seed % 30),
    poresScore: 60 + (seed % 15),
    wrinklesScore: 75 + (seed % 10),
    darkcirclesScore: 50 + (seed % 20),
    radianceScore: 55 + (seed % 20),
    undertone: ["warm", "cool", "neutral", "golden"][seed % 4] ?? "neutral",
    skinType: ["dry", "oily", "combination", "normal"][seed % 4] ?? "normal",
  };
  return { metrics, rawData: { simulated: true } };
}

export async function runApparelVto(userImageBase64: string, apparelImageUrl: string): Promise<{ resultImageUrl: string }> {
  if (!YOUCAM_API_KEY) {
    throw new Error("YOUCAM_API_KEY is not configured");
  }

  try {
    const response = await fetch(`${YOUCAM_BASE_URL}/apparelVTO`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": YOUCAM_API_KEY,
      },
      body: JSON.stringify({ user_image: userImageBase64, apparel_url: apparelImageUrl }),
    });

    if (response.ok) {
      const data = await response.json() as { result_url?: string };
      return { resultImageUrl: data.result_url ?? apparelImageUrl };
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: return the apparel image URL as-is for development
  return { resultImageUrl: apparelImageUrl };
}

export { deriveColorRecommendation, generateAiAdvice };
