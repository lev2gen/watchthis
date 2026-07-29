import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const contentEntriesTable = pgTable("content_entries", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ContentEntry = typeof contentEntriesTable.$inferSelect;
