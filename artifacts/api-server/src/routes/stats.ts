import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, scansTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/stats/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.dbUserId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.dbUserId!))
    .orderBy(desc(scansTable.createdAt))
    .limit(10);

  const completeScans = scans.filter(s => s.status === "complete" && s.skinMetrics);

  const latestScore = completeScans[0]?.skinMetrics?.overallScore ?? null;
  const previousScore = completeScans[1]?.skinMetrics?.overallScore ?? null;
  const scoreChange = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

  const latestHydration = completeScans[0]?.skinMetrics?.hydrationScore ?? null;
  const previousHydration = completeScans[1]?.skinMetrics?.hydrationScore ?? null;
  const hydrationTrend = latestHydration !== null && previousHydration !== null ? latestHydration - previousHydration : null;

  const latestAcne = completeScans[0]?.skinMetrics?.acneScore ?? null;
  const previousAcne = completeScans[1]?.skinMetrics?.acneScore ?? null;
  const acneTrend = latestAcne !== null && previousAcne !== null ? latestAcne - previousAcne : null;

  // Count streak weeks (consecutive weeks with at least 1 scan)
  let streakWeeks = 0;
  if (completeScans.length > 0) {
    const now = new Date();
    let weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    for (let i = 0; i < 12; i++) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const hasScan = scans.some(s => s.createdAt >= weekStart && s.createdAt < weekEnd);
      if (!hasScan && i > 0) break;
      if (hasScan) streakWeeks++;
      weekStart.setDate(weekStart.getDate() - 7);
    }
  }

  res.json({
    totalScans: user.totalScans,
    latestScore,
    scoreChange,
    hydrationTrend,
    acneTrend,
    streakWeeks,
    subscriptionStatus: user.subscriptionStatus,
    scanCredits: user.scanCredits,
  });
});

export default router;
