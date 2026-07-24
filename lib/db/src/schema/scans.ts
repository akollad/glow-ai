import { pgTable, serial, integer, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const scanStatusEnum = pgEnum("scan_status", ["pending", "processing", "complete", "failed"]);

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  selfieUrl: text("selfie_url"),
  selfieBase64: text("selfie_base64"), // stored temporarily for processing
  skinMetrics: jsonb("skin_metrics").$type<{
    overallScore: number;
    acneScore: number;
    hydrationScore: number;
    pigmentationScore: number;
    poresScore: number;
    wrinklesScore: number;
    darkcirclesScore: number;
    radianceScore: number;
    undertone: string | null;
    skinType: string | null;
  }>(),
  colorRecommendation: jsonb("color_recommendation").$type<{
    recommendedColors: string[];
    avoidColors: string[];
    necklineAdvice: string | null;
    styleAdvice: string | null;
  }>(),
  aiAdvice: text("ai_advice"),
  rawYoucamData: jsonb("raw_youcam_data"),
  status: scanStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
