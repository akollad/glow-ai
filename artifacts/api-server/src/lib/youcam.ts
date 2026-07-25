/**
 * YouCam Perfect Corp AI API — real integration
 * API server: https://yce-api-01.makeupar.com
 * Auth: Authorization: Bearer YOUR_API_KEY
 *
 * Flow:
 *  1. POST /s2s/v2.0/file/skin-analysis  → presigned URL + file_id
 *  2. PUT presigned URL (binary image)
 *  3. POST /s2s/v2.1/task/skin-analysis   → task_id
 *  4. Poll GET /s2s/v2.1/task/skin-analysis/{task_id} until success/error
 *  5. Parse output array → SkinMetrics
 *
 * Tier selection is automatic:
 *   - HD actions are tried first (higher quality, requires larger image).
 *   - If YouCam returns error_below_min_image_size, the same uploaded file
 *     is retried with SD actions (no hd_ prefix, lower resolution requirement).
 *   - DO NOT mix HD and SD actions within a single request.
 */

import { logger } from "./logger";

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const YOUCAM_BASE = "https://yce-api-01.makeupar.com";

// HD actions — tried first; requires a sufficiently large input image
const HD_ACTIONS = [
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

// SD actions — fallback for images too small for HD
const SD_ACTIONS = [
  "acne",
  "droopy_lower_eyelid",
  "eye_bag",
  "moisture",
  "pore",
  "redness",
  "texture",
  "skin_type",
  "tear_trough",
  "wrinkle",
  "age_spot",
  "radiance",
  "oiliness",
  "firmness",
  "droopy_upper_eyelid",
  "dark_circle_v2",
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
  // Extended — all 16 YouCam actions
  oilinessScore: number;
  firmnessScore: number;
  rednessScore: number;
  eyeBagScore: number;
  tearTroughScore: number;
  droopyLowerEyelidScore: number;
  droopyUpperEyelidScore: number;
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

async function createTask(fileId: string, actions: string[]): Promise<string> {
  const res = await fetch(`${YOUCAM_BASE}/s2s/v2.1/task/skin-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YOUCAM_API_KEY}`,
    },
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: actions,
      miniserver_args: { enable_mask_overlay: true },
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
  //   wholeByType  — the entry with region="whole" (or the first entry if no region)
  //   firstByType  — the first entry seen for each type (fallback)
  const wholeByType = new Map<string, YouCamOutputItem>();
  const firstByType = new Map<string, YouCamOutputItem>();

  for (const item of output) {
    if (!firstByType.has(item.type)) firstByType.set(item.type, item);
    if (item.region === "whole" || !item.region) wholeByType.set(item.type, item);
  }

  const byType = (type: string) => wholeByType.get(type) ?? firstByType.get(type);

  // Tier-agnostic lookup: accepts the base name and resolves hd_<name> first,
  // then falls back to the bare name (SD tier uses no prefix).
  const resolve = (base: string) => byType(`hd_${base}`) ?? byType(base);

  const score = (base: string, fallback = 70): number =>
    resolve(base)?.ui_score ?? fallback;

  // skin_type: YouCam returns the classification as a string field, not a score.
  // HD: type="hd_skin_type" with skin_type="Oily" etc.
  // SD: type="skin_type" with skin_type="Oily" etc.
  const skinTypeItem = resolve("skin_type");
  const skinType: string | null = skinTypeItem?.skin_type ?? null;

  // Undertone: derived from redness + age_spot scores (works for both tiers)
  const rednessScore = score("redness", 70);
  const ageSpot = score("age_spot", 70);
  let undertone: string | null = "neutral";
  if (rednessScore < 60 && ageSpot > 70) undertone = "warm";
  else if (rednessScore < 55) undertone = "cool";
  else if (ageSpot < 55) undertone = "golden";

  // "all" and "skin_age" are flat items in the output array with a "score" field.
  const allItem = firstByType.get("all");
  const skinAgeItem = firstByType.get("skin_age");

  // dark_circle: HD uses "hd_dark_circle", SD uses "dark_circle_v2"
  const darkcirclesScore =
    byType("hd_dark_circle")?.ui_score ??
    byType("dark_circle_v2")?.ui_score ??
    75;

  const overallScore = allItem?.score
    ? Math.round(allItem.score)
    : Math.round(
        (score("acne") +
          score("moisture") +
          score("radiance") +
          score("pore") +
          score("texture")) /
          5,
      );

  const skinAge = skinAgeItem?.score != null ? Math.round(skinAgeItem.score) : null;

  // Extended metrics — all 16 actions (rednessScore already declared above for undertone)
  const oilinessScore = score("oiliness", 70);
  const firmnessScore = score("firmness", 75);
  const eyeBagScore = score("eye_bag", 75);
  const tearTroughScore = score("tear_trough", 75);
  const droopyLowerEyelidScore = score("droopy_lower_eyelid", 75);
  const droopyUpperEyelidScore = score("droopy_upper_eyelid", 75);

  return {
    overallScore,
    acneScore: score("acne"),
    hydrationScore: score("moisture"),
    pigmentationScore: score("age_spot"),
    poresScore: score("pore"),
    wrinklesScore: score("wrinkle", 80),
    darkcirclesScore,
    radianceScore: score("radiance"),
    oilinessScore,
    firmnessScore,
    rednessScore,
    eyeBagScore,
    tearTroughScore,
    droopyLowerEyelidScore,
    droopyUpperEyelidScore,
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

    // Try HD first; if the image is too small, retry with SD automatically
    let task: YouCamTaskResult;
    try {
      const taskId = await createTask(fileId, HD_ACTIONS);
      logger.info({ taskId, tier: "HD" }, "YouCam [3/4] task created, polling");
      task = await pollTask(taskId);
    } catch (hdErr) {
      if (
        hdErr instanceof YouCamTaskError &&
        hdErr.errorCode === "error_below_min_image_size"
      ) {
        logger.warn({ fileId }, "YouCam HD failed: image too small — retrying with SD actions");
        const sdTaskId = await createTask(fileId, SD_ACTIONS);
        logger.info({ taskId: sdTaskId, tier: "SD" }, "YouCam [3/4] SD task created, polling");
        task = await pollTask(sdTaskId);
      } else {
        throw hdErr;
      }
    }

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
    oilinessScore: 60 + (seed % 20),
    firmnessScore: 65 + (seed % 15),
    rednessScore: 70 + (seed % 15),
    eyeBagScore: 65 + (seed % 20),
    tearTroughScore: 68 + (seed % 15),
    droopyLowerEyelidScore: 72 + (seed % 10),
    droopyUpperEyelidScore: 74 + (seed % 10),
    undertone: (["warm", "cool", "neutral", "golden"] as const)[seed % 4] ?? "neutral",
    skinType: (["Dry", "Oily", "Combination", "Normal"] as const)[seed % 4] ?? "Normal",
    skinAge: 20 + seed,
  };
  return { metrics, rawData: { simulated: true } };
}
