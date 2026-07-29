import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const checksTable = pgTable("checks", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  finalUrl: text("final_url").notNull(),
  httpStatus: integer("http_status").notNull(),
  riskLevel: text("risk_level").notNull(),
  riskScore: integer("risk_score").notNull(),
  result: jsonb("result").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCheckSchema = createInsertSchema(checksTable).omit({
  id: true,
  checkedAt: true,
});
export type InsertCheck = z.infer<typeof insertCheckSchema>;
export type Check = typeof checksTable.$inferSelect;
