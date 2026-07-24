import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "EXPIRED"]);
export const paymentPlanEnum = pgEnum("payment_plan", ["per_scan", "monthly"]);
export const currencyEnum = pgEnum("currency", ["USD", "CDF"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  referenceHub: text("reference_hub").unique(),
  amount: integer("amount").notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  planType: paymentPlanEnum("plan_type").notNull(),
  phone: text("phone").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
