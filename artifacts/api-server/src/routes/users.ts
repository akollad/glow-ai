import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { UpdateMeBody } from "@workspace/api-zod";

const router = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.dbUserId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    clerkUserId: user.clerkUserId,
    displayName: user.displayName,
    phone: user.phone,
    preferredTelecom: user.preferredTelecom,
    subscriptionStatus: user.subscriptionStatus,
    scanCredits: user.scanCredits,
    totalScans: user.totalScans,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { displayName, phone, preferredTelecom } = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (displayName !== undefined) updateData.displayName = displayName;
  if (phone !== undefined) updateData.phone = phone;
  if (preferredTelecom !== undefined) updateData.preferredTelecom = preferredTelecom;

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.dbUserId!)).returning();
  res.json({
    id: updated.id,
    clerkUserId: updated.clerkUserId,
    displayName: updated.displayName,
    phone: updated.phone,
    preferredTelecom: updated.preferredTelecom,
    subscriptionStatus: updated.subscriptionStatus,
    scanCredits: updated.scanCredits,
    totalScans: updated.totalScans,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
