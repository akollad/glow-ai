import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { InitiatePaymentBody } from "@workspace/api-zod";
import crypto from "node:crypto";

const router = Router();

const AKOLLAD_PRODUCT_KEY = process.env.AKOLLAD_PRODUCT_KEY;
const AKOLLAD_BASE_URL = "https://pay.akollad.com";
const PRODUCT_NAME = "glowai";

router.post("/payments/initiate", requireAuth, async (req, res): Promise<void> => {
  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, phone, currency, telecom, planType } = parsed.data;

  // Validate amounts match plans
  const expectedAmount = planType === "monthly" ? 5 : 1;
  const expectedCurrencyAmount = currency === "CDF" ? expectedAmount * 2800 : expectedAmount;
  if (amount !== expectedCurrencyAmount && currency === "USD" && amount !== expectedAmount) {
    res.status(400).json({ error: `Invalid amount for plan ${planType}` });
    return;
  }

  try {
    const response = await fetch(`${AKOLLAD_BASE_URL}/api/v1/payments/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-akollad-key": AKOLLAD_PRODUCT_KEY ?? "",
      },
      body: JSON.stringify({
        product: PRODUCT_NAME,
        amount,
        currency,
        phone,
        telecom,
        description: planType === "monthly" ? "Glow AI abonnement mensuel ($5)" : "Glow AI analyse peau ($1)",
        metadata: { planType, userId: req.dbUserId },
        callbackUrl: `${process.env.APP_URL ?? ""}/api/payments/callback`,
      }),
    });

    const data = await response.json() as { success?: boolean; referenceHub?: string; status?: string; message?: string };

    if (!response.ok || !data.success) {
      req.log.warn({ data }, "Payment initiation failed from provider");
      res.status(400).json({ error: data.message ?? "Payment initiation failed" });
      return;
    }

    // Store payment record
    await db.insert(paymentsTable).values({
      userId: req.dbUserId!,
      referenceHub: data.referenceHub,
      amount,
      currency: currency as "USD" | "CDF",
      planType: planType as "per_scan" | "monthly",
      phone,
      status: "PENDING",
    });

    res.status(201).json({
      success: true,
      referenceHub: data.referenceHub,
      status: data.status ?? "PENDING",
    });
  } catch (err) {
    req.log.error({ err }, "Payment initiation error");
    res.status(500).json({ error: "Payment service unavailable" });
  }
});

router.get("/payments/:referenceHub/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.referenceHub) ? req.params.referenceHub[0] : req.params.referenceHub;
  const referenceHub = raw!;

  try {
    const response = await fetch(`${AKOLLAD_BASE_URL}/api/v1/payments/${encodeURIComponent(referenceHub)}/status`);
    const data = await response.json() as { success?: boolean; transaction?: { referenceHub: string; status: string } };

    if (!response.ok || !data.success) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const status = data.transaction?.status ?? "PENDING";

    // Update local record
    await db.update(paymentsTable)
      .set({ status: status as "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED", updatedAt: new Date() })
      .where(eq(paymentsTable.referenceHub, referenceHub));

    // If payment succeeded, grant credits/subscription
    if (status === "SUCCESS") {
      const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.referenceHub, referenceHub)).limit(1);
      if (payment) {
        if (payment.planType === "monthly") {
          const expires = new Date();
          expires.setDate(expires.getDate() + 30);
          await db.update(usersTable).set({
            subscriptionStatus: "active",
            subscriptionExpiresAt: expires,
            updatedAt: new Date(),
          }).where(eq(usersTable.id, payment.userId));
        } else {
          // per_scan: add 1 credit
          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
          if (user) {
            await db.update(usersTable).set({
              scanCredits: user.scanCredits + 1,
              updatedAt: new Date(),
            }).where(eq(usersTable.id, payment.userId));
          }
        }
      }
    }

    res.json({ referenceHub, status });
  } catch (err) {
    req.log.error({ err }, "Payment status check error");
    res.status(500).json({ error: "Payment service unavailable" });
  }
});

// Webhook callback from pay.akollad.com
router.post("/payments/callback", async (req, res): Promise<void> => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers["x-pay-akollad-signature"] as string | undefined;

  if (process.env.PAY_NOTIFY_SECRET && signature) {
    const expected = crypto
      .createHmac("sha256", process.env.PAY_NOTIFY_SECRET)
      .update(rawBody)
      .digest("hex");
    if (expected !== signature) {
      res.status(401).json({ success: false, message: "Invalid signature" });
      return;
    }
  }

  const { referenceHub, status, metadata } = req.body as {
    referenceHub?: string;
    status?: string;
    metadata?: { planType?: string; userId?: number };
  };

  if (!referenceHub || !status) {
    res.status(400).json({ success: false });
    return;
  }

  await db.update(paymentsTable)
    .set({ status: status as "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED", updatedAt: new Date() })
    .where(eq(paymentsTable.referenceHub, referenceHub));

  if (status === "SUCCESS" && metadata?.userId) {
    const planType = metadata.planType;
    if (planType === "monthly") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await db.update(usersTable).set({
        subscriptionStatus: "active",
        subscriptionExpiresAt: expires,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, metadata.userId));
    } else {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, metadata.userId)).limit(1);
      if (user) {
        await db.update(usersTable).set({
          scanCredits: user.scanCredits + 1,
          updatedAt: new Date(),
        }).where(eq(usersTable.id, metadata.userId));
      }
    }
  }

  res.json({ success: true });
});

router.get("/subscriptions/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.dbUserId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Auto-expire subscriptions
  if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
    await db.update(usersTable).set({ subscriptionStatus: "expired", updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    user.subscriptionStatus = "expired";
  }

  res.json({
    status: user.subscriptionStatus,
    plan: user.subscriptionStatus === "active" ? "monthly" : null,
    expiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
    scanCredits: user.scanCredits,
  });
});

export default router;
