import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "active", "expired"]);
export const telecomEnum = pgEnum("telecom", ["AM", "OM", "MP"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  displayName: text("display_name"),
  phone: text("phone"),
  preferredTelecom: telecomEnum("preferred_telecom"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  scanCredits: integer("scan_credits").notNull().default(1), // 1 free scan on signup
  totalScans: integer("total_scans").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
