import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUserId?: number;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = clerkUserId;

  // JIT-provision user in DB if not yet present (upsert to handle concurrent requests)
  try {
    const [user] = await db
      .insert(usersTable)
      .values({ clerkUserId })
      .onConflictDoUpdate({
        target: usersTable.clerkUserId,
        set: { updatedAt: new Date() },
      })
      .returning();
    req.dbUserId = user!.id;
  } catch (err) {
    req.log.error({ err }, "Failed to provision user");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  next();
};
