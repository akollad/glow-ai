import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, scansTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { GenerateTiktokClipBody } from "@workspace/api-zod";

const router = Router();

const HASHTAGS = [
  "#GlowAI",
  "#PeauAfricaine",
  "#GlowUp",
  "#SkincareDRC",
  "#Kinshasa",
  "#MelanineRiche",
  "#SkinScore",
  "#BeauteAfricaine",
];

router.post("/tiktok/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateTiktokClipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [scan] = await db.select().from(scansTable)
    .where(eq(scansTable.id, parsed.data.scanId))
    .limit(1);

  if (!scan || scan.userId !== req.dbUserId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  if (scan.status !== "complete" || !scan.skinMetrics) {
    res.status(400).json({ error: "Scan is not complete yet" });
    return;
  }

  const score = scan.skinMetrics.overallScore;
  const caption = `Mon score peau : ${score}/100 avec Glow AI — le dermatologue de poche pour la peau africaine. Ton glow-up commence ici!`;
  const shareUrl = `${process.env.APP_URL ?? "https://glowai.app"}/scan/${scan.id}`;

  // TikTok web intent URL
  const tiktokUrl = `https://www.tiktok.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`;

  res.json({
    shareUrl: tiktokUrl,
    previewImageUrl: scan.selfieUrl,
    caption,
    hashtags: HASHTAGS,
  });
});

export default router;
