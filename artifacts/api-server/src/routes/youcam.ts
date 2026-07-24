import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { RunSkinAnalysisBody, RunApparelVtoBody } from "@workspace/api-zod";
import { analyzeSkin, runApparelVto, deriveColorRecommendation } from "../lib/youcam";

const router = Router();

router.post("/youcam/skin-analysis", requireAuth, async (req, res): Promise<void> => {
  const parsed = RunSkinAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { metrics, rawData } = await analyzeSkin(parsed.data.imageBase64);
  res.json({ metrics, rawData });
});

router.post("/youcam/apparel-vto", requireAuth, async (req, res): Promise<void> => {
  const parsed = RunApparelVtoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await runApparelVto(parsed.data.userImageBase64, parsed.data.apparelImageUrl);
  res.json(result);
});

export default router;
