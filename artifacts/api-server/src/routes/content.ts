import { Router, type IRouter } from "express";
import { db, contentEntriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/content", async (_req, res): Promise<void> => {
  const rows = await db.select().from(contentEntriesTable);
  const map: Record<string, unknown> = {};
  for (const row of rows) map[row.key] = row.value;
  res.json(map);
});

export default router;
