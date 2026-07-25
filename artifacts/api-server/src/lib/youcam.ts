/**
 * YouCam Perfect Corp AI API — real integration
 * API server: https://yce-api-01.makeupar.com
 * Auth: Authorization: Bearer YOUR_API_KEY
 *
 * Flow:
 *  1. POST /s2s/v2.0/file/skin-analysis  → presigned URL + file_id
 *  2. PUT presigned URL (binary image)
 *  3. POST /s2s/v2.1/task/skin-analysis   → task_id  (v2.1 — HD actions)
 *  4. Poll GET /s2s/v2.1/task/skin-analysis/{task_id} until success/error
 *  5. Parse output array → SkinMetrics
 *
 * All dst_actions use the HD prefix for higher-quality analysis.
 * DO NOT mix HD and SD actions — use one tier consistently.
 */

import { logger } from "./logger";

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const YOUCAM_BASE = "https://yce-api-01.makeupar.com";

// HD dst_actions — all HD tier, no mixing with SD
const DST_ACTIONS = [
  "hd_acne",
  "hd_droopy_lower_eyelid",
  "hd_eye_bag",
  "hd_moisture",
  "hd_pore",
  "hd_redness",
  "hd_texture",
  "hd_skin_type",
  "hd_tear_trough",
  "hd_wrinkle",
  "hd_age_spot",
  "hd_radiance",
  "hd_oiliness",
  "hd_firmness",
  "hd_droopy_upper_eyelid",
  "hd_dark_circle",
];

// ─── Types ────────────────────────────────────────────────────────────────────

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
  skinAge: number | null;
}

export interface ColorRecommendation {
  recommendedColors: string[];
  avoidColors: string[];
  necklineAdvice: string | null;
  styleAdvice: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip the data-URL prefix and return raw base64 + mime type */
function parseBase64Image(imageBase64: string): { buffer: Buffer; mimeType: string } {
  let raw = imageBase64;
  let mimeType = "image/jpeg";

  if (imageBase64.startsWith("data:")) {
    const [header, data] = imageBase64.split(",");
    raw = data ?? "";
    const match = header?.match(/data:([^;]+)/);
    if (match?.[1]) mimeType = match[1];
  }

  return { buffer: Buffer.from(raw, "base64"), mimeType };
}

/** Map a mimeType to a file extension for the upload filename */
function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "jpg";
}

/** Sleep for ms milliseconds */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Step 1 + 2: upload image to S3 via YouCam File API ──────────────────────

async function uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
  const fileName = `skin_analysis_${Date.now()}.${extFromMime(mimeType)}`;
  const fileSize = buffer.byteLength;

  // Step 1 — get presigned upload URL + file_id
  const initRes = await fetch(`${YOUCAM_BASE}/s2s/v2.0/file/skin-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YOUCAM_API_KEY}`,
    },
    body: JSON.stringify({
      files: [{ content_type: mimeType, file_name: fileName, file_size: fileSize }],
    }),
  });

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`YouCam File API error ${initRes.status}: ${text}`);
  }

  const initData = await initRes.json() as {
    data: {
      files: Array<{
        file_id: string;
        requests: Array<{ method: string; url: string; headers: Record<string, string> }>;
      }>;
    };
  };

  const fileEntry = initData.data.files[0];
  if (!fileEntry) throw new Error("YouCam File API: no file entry in response");

  const uploadRequest = fileEntry.requests[0];
  if (!uploadRequest) throw new Error("YouCam File API: no upload request in response");

  // Step 2 — upload image binary to presigned S3 URL
  const uploadRes = await fetch(uploadRequest.url, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileSize),
      ...uploadRequest.headers,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`S3 upload failed ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  return fileEntry.file_id;
}

// ─── Step 3: create AI task ───────────────────────────────────────────────────

async function createTask(fileId: string): Promise<string> {
  const res = await fetch(`${YOUCAM_BASE}/s2s/v2.1/task/skin-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YOUCAM_API_KEY}`,
    },
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: DST_ACTIONS,
      miniserver_args: { enable_mask_overlay: false },
      format: "json",
      pf_camera_kit: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouCam Task API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { data: { task_id: string } };
  if (!data.data?.task_id) throw new Error("YouCam Task API: no task_id in response");

  return data.data.task_id;
}

// ─── Step 4: poll task until success/error ────────────────────────────────────

interface YouCamOutputItem {
  type: string;
  // Numeric-score items
  ui_score?: number;
  raw_score?: number;
  // Aggregate items ("all", "skin_age") use "score" instead of "ui_score"
  score?: number;
  // Multi-region items (hd_pore, hd_wrinkle, hd_skin_type) carry a region tag
  region?: string;
  // hd_skin_type returns a classification string, not a numeric score
  skin_type?: string;
  mask_urls?: string[];
  url?: string | null;
}

interface YouCamTaskResult {
  task_status: "running" | "success" | "error";
  results?: {
    // All result items live in the flat "output" array —
    // "all", "skin_age", and "resize_image" are items inside it, not separate keys.
    output: YouCamOutputItem[];
  };
  error?: string;      // YouCam uses "error" not "error_code"
  error_code?: string; // keep for safety
}

/** Structured error carrying the YouCam error_code for downstream handling */
export class YouCamTaskError extends Error {
  constructor(public readonly errorCode: string) {
    super(`YouCam task failed: ${errorCode}`);
    this.name = "YouCamTaskError";
  }
}

async function pollTask(taskId: string, maxWaitMs = 60_000): Promise<YouCamTaskResult> {
  const start = Date.now();
  let interval = 1500; // start at 1.5s, back off gently

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${YOUCAM_BASE}/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${YOUCAM_API_KEY}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouCam poll error ${res.status}: ${text}`);
    }

    const data = await res.json() as { data: YouCamTaskResult };
    const task = data.data;

    if (task.task_status === "success") return task;
    if (task.task_status === "error") {
      // Log the full raw task so we can see the exact error structure from YouCam
      logger.error({ rawTask: task }, "YouCam task returned error status");
      throw new YouCamTaskError(task.error ?? task.error_code ?? "unknown_internal_error");
    }

    await sleep(interval);
    interval = Math.min(interval * 1.3, 4000); // gentle back-off, cap at 4s
  }

  throw new YouCamTaskError("timeout");
}

// ─── Step 5: parse YouCam output → SkinMetrics ───────────────────────────────

function parseMetrics(task: YouCamTaskResult): SkinMetrics {
  const output = task.results?.output ?? [];

  // For multi-region types (hd_pore, hd_wrinkle, hd_skin_type) YouCam returns
  // one entry per region. Build two maps:
  //   wholeByType  — the entry with region="whole" (or the first if none)
  //   firstByType  — the first entry seen for each type (fallback)
  const wholeByType = new Map<string, YouCamOutputItem>();
  const firstByType = new Map<string, YouCamOutputItem>();

  for (const item of output) {
    if (!firstByType.has(item.type)) firstByType.set(item.type, item);
    if (item.region === "whole" || !item.region) wholeByType.set(item.type, item);
  }

  const byType = (type: string) => wholeByType.get(type) ?? firstByType.get(type);

  const score = (type: string, fallback = 70): number =>
    byType(type)?.ui_score ?? fallback;

  // hd_skin_type: YouCam returns the classification directly as a string field.
  // The "whole" region entry is the full-face classification.
  const skinTypeItem = byType("hd_skin_type");
  const skinType: string | null = skinTypeItem?.skin_type ?? null;

  // Undertone: derive from redness + age_spot scores
  const rednessScore = score("hd_redness", 70);
  const ageSpot = score("hd_age_spot", 70);
  let undertone: string | null = "neutral";
  if (rednessScore < 60 && ageSpot > 70) undertone = "warm";
  else if (rednessScore < 55) undertone = "cool";
  else if (ageSpot < 55) undertone = "golden";

  // "all" and "skin_age" are flat items inside the output array with a "score" field.
  const allItem = firstByType.get("all");
  const skinAgeItem = firstByType.get("skin_age");

  const overallScore = allItem?.score
    ? Math.round(allItem.score)
    : Math.round(
        (score("hd_acne") +
          score("hd_moisture") +
          score("hd_radiance") +
          score("hd_pore") +
          score("hd_texture")) /
          5,
      );

  const skinAge = skinAgeItem?.score != null ? Math.round(skinAgeItem.score) : null;

  return {
    overallScore,
    acneScore: score("hd_acne"),
    hydrationScore: score("hd_moisture"),
    pigmentationScore: score("hd_age_spot"),
    poresScore: score("hd_pore"),
    wrinklesScore: score("hd_wrinkle", 80),
    darkcirclesScore: score("hd_dark_circle", 75),
    radianceScore: score("hd_radiance"),
    undertone,
    skinType,
    skinAge,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeSkin(
  imageBase64: string,
): Promise<{ metrics: SkinMetrics; rawData: Record<string, unknown> }> {
  if (!YOUCAM_API_KEY) {
    logger.warn("YOUCAM_API_KEY not set — using simulated response");
    return simulatedResponse(imageBase64);
  }

  try {
    const { buffer, mimeType } = parseBase64Image(imageBase64);
    logger.info({ mimeType, fileSizeBytes: buffer.byteLength }, "YouCam [1/4] uploading image");

    const fileId = await uploadImage(buffer, mimeType);
    logger.info({ fileId }, "YouCam [2/4] file uploaded, creating task");

    const taskId = await createTask(fileId);
    logger.info({ taskId }, "YouCam [3/4] task created, polling");

    const task = await pollTask(taskId);
    logger.info({ taskStatus: task.task_status, outputCount: task.results?.output?.length ?? 0 }, "YouCam [4/4] task complete");

    const metrics = parseMetrics(task);
    return {
      metrics,
      rawData: task.results as unknown as Record<string, unknown>,
    };
  } catch (err) {
    const isTaskError = err instanceof YouCamTaskError;
    logger.error(
      { err, errorCode: isTaskError ? (err as YouCamTaskError).errorCode : undefined },
      "YouCam API call failed — falling back to simulation",
    );
    // Re-throw task errors so the scan can be marked failed with the right code
    // instead of silently falling back to simulation
    if (isTaskError) throw err;
    return simulatedResponse(imageBase64);
  }
}

export async function runApparelVto(
  userImageBase64: string,
  apparelImageUrl: string,
): Promise<{ resultImageUrl: string }> {
  // Apparel VTO uses a separate endpoint — for now return the apparel image
  // as a visual placeholder until the VTO endpoint credentials are confirmed.
  // The real integration would follow the same upload → task → poll pattern
  // using /s2s/v2.0/file/apparel-vto and /s2s/v2.0/task/apparel-vto.
  void userImageBase64;
  return { resultImageUrl: apparelImageUrl };
}

// ─── Color / AI advice derivation (unchanged) ─────────────────────────────────

export function deriveColorRecommendation(metrics: SkinMetrics): ColorRecommendation {
  const { undertone, pigmentationScore, radianceScore } = metrics;

  let recommendedColors: string[] = [];
  let avoidColors: string[] = [];
  let necklineAdvice: string | null = null;
  let styleAdvice: string | null = null;

  if (undertone === "warm" || undertone === "golden") {
    recommendedColors = ["#C4622D", "#D4A853", "#8B6914", "#A0522D", "#CD853F", "#DAA520"];
    avoidColors = ["#FF6B6B", "#FF69B4", "#E91E63"];
    styleAdvice =
      "Les teintes terre et dorées subliment votre sous-ton chaud. Privilegiez l'orange brûlé, l'ocre et le doré.";
  } else if (undertone === "cool") {
    recommendedColors = ["#4682B4", "#708090", "#8FBC8F", "#20B2AA", "#9370DB", "#DC143C"];
    avoidColors = ["#FFA500", "#FFD700", "#FFFF00"];
    styleAdvice =
      "Les tons froids et vibrants vous mettent en valeur — bleu marine, vert sauge, bordeaux profond.";
  } else {
    recommendedColors = ["#8B4513", "#A0522D", "#D2691E", "#CD853F", "#2F4F4F", "#556B2F"];
    avoidColors = [];
    styleAdvice =
      "Votre sous-ton neutre vous permet de porter presque toutes les couleurs. Expérimentez!";
  }

  if (pigmentationScore < 50) {
    necklineAdvice =
      "Les cols montants et les encolures en V hautes détournent l'attention vers le regard.";
    avoidColors = [...avoidColors, "#FF0000"];
  }

  if (radianceScore < 60) {
    styleAdvice =
      (styleAdvice ?? "") +
      " Évitez les couleurs ternes — un vêtement lumineux compensera le manque d'éclat.";
  }

  return { recommendedColors, avoidColors, necklineAdvice, styleAdvice };
}

export function generateAiAdvice(metrics: SkinMetrics): string {
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

  if (metrics.hydrationScore < 60) {
    lines.push(
      "Hydratation insuffisante — cherchez un sérum à l'acide hyaluronique, pas une crème éclaircissante.",
    );
  }

  if (metrics.pigmentationScore < 50) {
    lines.push(
      "Hyperpigmentation détectée. Arrêtez les produits éclaircissants — votre peau a besoin de niacinamide et de protection solaire SPF 50+.",
    );
  }

  if (metrics.acneScore < 60) {
    lines.push(
      "Des imperfections sont visibles. Un nettoyant à l'acide salicylique utilisé le soir peut aider.",
    );
  }

  if (metrics.radianceScore < 50) {
    lines.push(
      "Votre peau manque d'éclat. La vitamine C sérum matin + exfoliation douce une fois par semaine feront la différence.",
    );
  }

  return lines.join(" ");
}

// ─── Simulation fallback ──────────────────────────────────────────────────────

function simulatedResponse(
  imageBase64: string,
): { metrics: SkinMetrics; rawData: Record<string, unknown> } {
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
    undertone: (["warm", "cool", "neutral", "golden"] as const)[seed % 4] ?? "neutral",
    skinType: (["Dry", "Oily", "Combination", "Normal"] as const)[seed % 4] ?? "Normal",
    skinAge: 20 + seed,
  };
  return { metrics, rawData: { simulated: true } };
}
