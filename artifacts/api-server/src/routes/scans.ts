import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, scansTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateScanBody } from "@workspace/api-zod";
import { analyzeSkin, deriveColorRecommendation, generateAiAdvice } from "../lib/youcam";

const router = Router();

function formatScan(scan: typeof scansTable.$inferSelect) {
  return {
    id: scan.id,
    userId: scan.userId,
    selfieUrl: scan.selfieUrl,
    skinMetrics: scan.skinMetrics,
    colorRecommendation: scan.colorRecommendation,
    aiAdvice: scan.aiAdvice,
    status: scan.status,
    createdAt: scan.createdAt.toISOString(),
  };
}

router.get("/scans", requireAuth, async (req, res): Promise<void> => {
  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.dbUserId!))
    .orderBy(desc(scansTable.createdAt));
  res.json(scans.map(formatScan));
});

router.get("/scans/latest", requireAuth, async (req, res): Promise<void> => {
  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.dbUserId!))
    .orderBy(desc(scansTable.createdAt))
    .limit(1);
  if (!scan) {
    res.status(404).json({ error: "No scans found" });
    return;
  }
  res.json(formatScan(scan));
});

router.get("/scans/:scanId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.scanId) ? req.params.scanId[0] : req.params.scanId;
  const scanId = parseInt(raw!, 10);
  if (isNaN(scanId)) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }
  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId)).limit(1);
  if (!scan || scan.userId !== req.dbUserId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }
  res.json(formatScan(scan));
});

router.post("/scans", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check if user has credits or active subscription
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.dbUserId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const hasAccess =
    user.subscriptionStatus === "active" ||
    user.scanCredits > 0;

  if (!hasAccess) {
    res.status(402).json({ error: "Payment required. Purchase a scan credit or subscribe." });
    return;
  }

  // Create scan record as processing
  const [scan] = await db.insert(scansTable).values({
    userId: req.dbUserId!,
    status: "processing",
    selfieBase64: parsed.data.selfieBase64,
  }).returning();

  // Deduct credit if not on active subscription
  if (user.subscriptionStatus !== "active") {
    await db.update(usersTable)
      .set({ scanCredits: user.scanCredits - 1, totalScans: user.totalScans + 1, updatedAt: new Date() })
      .where(eq(usersTable.id, req.dbUserId!));
  } else {
    await db.update(usersTable)
      .set({ totalScans: user.totalScans + 1, updatedAt: new Date() })
      .where(eq(usersTable.id, req.dbUserId!));
  }

  // Run YouCam analysis asynchronously
  (async () => {
    try {
      const { metrics, rawData } = await analyzeSkin(parsed.data.selfieBase64);
      const colorRec = deriveColorRecommendation(metrics);
      const aiAdvice = generateAiAdvice(metrics);

      await db.update(scansTable).set({
        skinMetrics: metrics,
        colorRecommendation: colorRec,
        aiAdvice,
        rawYoucamData: rawData as Record<string, unknown>,
        status: "complete",
        updatedAt: new Date(),
      }).where(eq(scansTable.id, scan.id));
    } catch {
      await db.update(scansTable).set({ status: "failed", updatedAt: new Date() }).where(eq(scansTable.id, scan.id));
    }
  })();

  res.status(201).json(formatScan(scan));
});

export default router;
