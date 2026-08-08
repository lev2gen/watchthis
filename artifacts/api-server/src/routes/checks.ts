import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, checksTable } from "@workspace/db";
import { RunCheckBody, RunCheckResponse, GetStatsResponse } from "@workspace/api-zod";
import { assertPublicUrl, SsrfError } from "../lib/ssrf";
import { runRenderCheck, CheckError, type CheckOutcome } from "../lib/checker";
import { rateLimit } from "../lib/rateLimit";

const router: IRouter = Router();

// Short-lived result cache keyed by normalized URL
const cache = new Map<string, { expiresAt: number; payload: unknown }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}, 60_000).unref();

router.post(
  "/check",
  rateLimit({ windowMs: 60_000, max: 6 }),
  async (req, res): Promise<void> => {
    const parsed = RunCheckBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please provide a valid URL." });
      return;
    }

    let url: URL;
    try {
      url = await assertPublicUrl(parsed.data.url.trim());
    } catch (err) {
      res.status(400).json({ error: err instanceof SsrfError ? err.message : "Invalid URL" });
      return;
    }

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

    let outcome: CheckOutcome;
    try {
      outcome = await runRenderCheck(url);
    } catch (err) {
      if (err instanceof CheckError) {
        req.log.warn({ url: cacheKey, err: err.message }, "Check failed");
        res.status(err.status).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "Unexpected check failure");
      res.status(502).json({ error: "The check failed unexpectedly. Please try again." });
      return;
    }

    const [row] = await db
      .insert(checksTable)
      .values({
        url: url.toString(),
        finalUrl: outcome.finalUrl,
        httpStatus: outcome.httpStatus,
        riskLevel: outcome.riskLevel,
        riskScore: outcome.riskScore,
        result: outcome,
      })
      .returning();

    const payload = RunCheckResponse.parse({
      id: row!.id,
      url: url.toString(),
      checkedAt: row!.checkedAt.toISOString(),
      ...outcome,
    });
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    res.json(payload);
  },
);

router.get("/stats", async (_req, res): Promise<void> => {
  const [row] = await db
    .select({
      totalChecks: sql<number>`count(*)::int`,
      lowCount: sql<number>`count(*) filter (where ${checksTable.riskLevel} = 'LOW')::int`,
      mediumCount: sql<number>`count(*) filter (where ${checksTable.riskLevel} = 'MEDIUM')::int`,
      highCount: sql<number>`count(*) filter (where ${checksTable.riskLevel} = 'HIGH')::int`,
    })
    .from(checksTable);

  res.json(GetStatsResponse.parse(row));
});

export default router;
