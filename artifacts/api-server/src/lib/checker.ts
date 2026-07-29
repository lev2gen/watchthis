import { execSync } from "node:child_process";
import { parse } from "node-html-parser";
import { chromium, type Browser } from "playwright-core";
import { logger } from "./logger";
import { assertPublicUrl } from "./ssrf";

export interface Snapshot {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  metaRobots: string | null;
  h1: string[];
  internalLinksCount: number;
  wordCount: number;
  structuredDataTypes: string[];
  imagesTotal: number;
  imagesWithoutAlt: number;
  htmlBytes: number;
}

export interface Finding {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
  rawValue?: string | null;
  renderedValue?: string | null;
}

export interface RedirectHop {
  url: string;
  status: number;
}

export interface CheckOutcome {
  finalUrl: string;
  httpStatus: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  findings: Finding[];
  raw: Snapshot;
  rendered: Snapshot;
  jsErrors: string[];
  blockedResources: string[];
  redirectChain: RedirectHop[];
  renderMs: number;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; WatchThisBot/1.0; +https://watchthis.dev) Chrome/120 Safari/537.36";

const FETCH_TIMEOUT_MS = 20_000;
const RENDER_TIMEOUT_MS = 30_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export class CheckError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

function findChromium(): string {
  try {
    return execSync("command -v chromium || command -v chromium-browser", { encoding: "utf8" })
      .trim()
      .split("\n")[0]!;
  } catch {
    throw new CheckError("Headless browser is not available on this server", 500);
  }
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        executablePath: findChromium(),
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      })
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null;
        });
        return browser;
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

function extractSnapshotFromHtml(html: string, baseUrl: string): Snapshot {
  const root = parse(html, { comment: false });
  const pick = (selector: string, attr?: string): string | null => {
    const el = root.querySelector(selector);
    if (!el) return null;
    const value = attr ? el.getAttribute(attr) : el.text;
    return value?.trim() || null;
  };

  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    /* ignore */
  }

  let internalLinksCount = 0;
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) internalLinksCount += 1;
    } catch {
      /* ignore */
    }
  }

  const structuredDataTypes: string[] = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.text);
      const items = Array.isArray(data) ? data : data["@graph"] && Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const item of items) {
        const type = item?.["@type"];
        if (typeof type === "string") structuredDataTypes.push(type);
        else if (Array.isArray(type)) structuredDataTypes.push(...type.filter((t) => typeof t === "string"));
      }
    } catch {
      /* invalid JSON-LD — skip */
    }
  }

  const images = root.querySelectorAll("img");
  const imagesWithoutAlt = images.filter((img) => {
    const alt = img.getAttribute("alt");
    return alt == null || alt.trim() === "";
  }).length;

  const bodyClone = root.querySelector("body");
  let wordCount = 0;
  if (bodyClone) {
    for (const tag of ["script", "style", "noscript", "template"]) {
      bodyClone.querySelectorAll(tag).forEach((el) => el.remove());
    }
    wordCount = bodyClone.text.split(/\s+/).filter(Boolean).length;
  }

  return {
    title: pick("title"),
    metaDescription: pick('meta[name="description"]', "content"),
    canonical: pick('link[rel="canonical"]', "href"),
    metaRobots: pick('meta[name="robots"]', "content"),
    h1: root.querySelectorAll("h1").map((el) => el.text.trim()).filter(Boolean),
    internalLinksCount,
    wordCount,
    structuredDataTypes: [...new Set(structuredDataTypes)].sort(),
    imagesTotal: images.length,
    imagesWithoutAlt,
    htmlBytes: Buffer.byteLength(html, "utf8"),
  };
}

async function fetchRaw(url: URL): Promise<{ html: string; status: number; finalUrl: string; redirectChain: RedirectHop[]; truncated: boolean }> {
  const redirectChain: RedirectHop[] = [];
  let current = url.toString();
  for (let hop = 0; hop < 10; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*" },
      });
    } catch (err) {
      throw new CheckError(
        err instanceof Error && err.name === "AbortError"
          ? "The target site timed out"
          : "The target site could not be reached",
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new CheckError(`Redirect (${response.status}) without a Location header`);
      redirectChain.push({ url: current, status: response.status });
      current = new URL(location, current).toString();
      // Re-validate each hop against SSRF
      await assertPublicUrl(current).catch(() => {
        throw new CheckError("Redirect target is not allowed");
      });
      continue;
    }

    const reader = response.body?.getReader();
    let html = "";
    let bytes = 0;
    let truncated = false;
    if (reader) {
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_HTML_BYTES) {
          truncated = true;
          await reader.cancel();
          break;
        }
        html += decoder.decode(value, { stream: true });
      }
    }
    return { html, status: response.status, finalUrl: current, redirectChain, truncated };
  }
  throw new CheckError("Too many redirects");
}

async function fetchRendered(url: string): Promise<{ html: string; jsErrors: string[]; blockedResources: string[]; renderMs: number }> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
  });
  const jsErrors: string[] = [];
  const blockedResources: string[] = [];
  const started = Date.now();
  try {
    const page = await context.newPage();
    // SSRF enforcement during rendering: every http(s) request the page makes
    // (subresources, XHR, client-side navigations) is validated against the
    // private-IP/hostname policy and aborted if it targets internal addresses.
    await page.route(/^https?:\/\//, async (route) => {
      try {
        await assertPublicUrl(route.request().url());
        await route.continue();
      } catch {
        await route.abort("blockedbyclient").catch(() => {});
      }
    });
    page.on("pageerror", (err) => {
      if (jsErrors.length < 20) jsErrors.push(String(err.message ?? err).slice(0, 300));
    });
    page.on("console", (msg) => {
      if (msg.type() === "error" && jsErrors.length < 20) jsErrors.push(msg.text().slice(0, 300));
    });
    page.on("requestfailed", (req) => {
      const failure = req.failure()?.errorText ?? "failed";
      if (failure.includes("ERR_ABORTED")) return;
      if (blockedResources.length < 20) blockedResources.push(`${req.url().slice(0, 200)} (${failure})`);
    });

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: RENDER_TIMEOUT_MS });
    } catch (err) {
      // networkidle may time out on chatty pages — fall back to whatever loaded
      if (!(err instanceof Error && err.message.includes("Timeout"))) {
        throw new CheckError("Rendering the page failed or timed out");
      }
    }
    await page.waitForTimeout(500);
    // Browser-level redirects bypass route interception — re-validate where
    // the main frame (and any subframes) actually ended up before reading DOM.
    for (const frame of page.frames()) {
      const frameUrl = frame.url();
      if (!/^https?:\/\//.test(frameUrl)) continue;
      try {
        await assertPublicUrl(frameUrl);
      } catch {
        throw new CheckError("The page redirected to a disallowed address during rendering");
      }
    }
    const html = await page.content();
    return { html, jsErrors, blockedResources, renderMs: Date.now() - started };
  } finally {
    await context.close().catch((err) => logger.warn({ err }, "Failed to close browser context"));
  }
}

function compare(raw: Snapshot, rendered: Snapshot, httpStatus: number, jsErrors: string[], blockedResources: string[], redirectChain: RedirectHop[], rawTruncated = false): { findings: Finding[]; riskLevel: "LOW" | "MEDIUM" | "HIGH"; riskScore: number } {
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  if (!raw.title && rendered.title) {
    add({ id: "title-js-only", severity: "critical", category: "Title", message: "The <title> tag only appears after JavaScript rendering. Googlebot may index the page without a title.", rawValue: raw.title, renderedValue: rendered.title });
  } else if (raw.title && rendered.title && raw.title !== rendered.title) {
    add({ id: "title-changed", severity: "warning", category: "Title", message: "The <title> changes after JavaScript rendering.", rawValue: raw.title, renderedValue: rendered.title });
  } else if (!raw.title && !rendered.title) {
    add({ id: "title-missing", severity: "critical", category: "Title", message: "The page has no <title> tag at all.", rawValue: null, renderedValue: null });
  }

  if (!raw.metaDescription && rendered.metaDescription) {
    add({ id: "description-js-only", severity: "warning", category: "Meta description", message: "The meta description only appears after JavaScript rendering.", rawValue: raw.metaDescription, renderedValue: rendered.metaDescription });
  } else if (!raw.metaDescription && !rendered.metaDescription) {
    add({ id: "description-missing", severity: "info", category: "Meta description", message: "The page has no meta description.", rawValue: null, renderedValue: null });
  }

  if (!raw.canonical && rendered.canonical) {
    add({ id: "canonical-js-only", severity: "critical", category: "Canonical", message: "The canonical link is missing from the raw HTML and only appears after rendering. Google may pick the wrong canonical URL.", rawValue: raw.canonical, renderedValue: rendered.canonical });
  } else if (!raw.canonical && !rendered.canonical) {
    add({ id: "canonical-missing", severity: "warning", category: "Canonical", message: "No canonical link found in raw or rendered HTML.", rawValue: null, renderedValue: null });
  } else if (raw.canonical && rendered.canonical && raw.canonical !== rendered.canonical) {
    add({ id: "canonical-changed", severity: "critical", category: "Canonical", message: "The canonical URL changes after JavaScript rendering — Google may see conflicting signals.", rawValue: raw.canonical, renderedValue: rendered.canonical });
  }

  if (raw.metaRobots !== rendered.metaRobots) {
    add({ id: "robots-changed", severity: "critical", category: "Meta robots", message: "The meta robots directive changes after JavaScript rendering. Indexing directives must be present in the raw HTML.", rawValue: raw.metaRobots, renderedValue: rendered.metaRobots });
  }
  const robots = (raw.metaRobots ?? "").toLowerCase();
  if (robots.includes("noindex")) {
    add({ id: "noindex", severity: "warning", category: "Meta robots", message: "The page is marked noindex in the raw HTML.", rawValue: raw.metaRobots, renderedValue: rendered.metaRobots });
  }

  if (raw.h1.length === 0 && rendered.h1.length > 0) {
    add({ id: "h1-js-only", severity: "critical", category: "Headings", message: "The H1 heading is generated by JavaScript and is missing from the raw HTML.", rawValue: null, renderedValue: rendered.h1[0] ?? null });
  } else if (raw.h1.length === 0 && rendered.h1.length === 0) {
    add({ id: "h1-missing", severity: "warning", category: "Headings", message: "The page has no H1 heading.", rawValue: null, renderedValue: null });
  } else if (rendered.h1.length > 1) {
    add({ id: "h1-multiple", severity: "info", category: "Headings", message: `The rendered page has ${rendered.h1.length} H1 headings; one per page is recommended.`, rawValue: String(raw.h1.length), renderedValue: String(rendered.h1.length) });
  }

  if (raw.internalLinksCount === 0 && rendered.internalLinksCount > 0) {
    add({ id: "links-js-only", severity: "critical", category: "Internal links", message: "Internal links are missing from the raw HTML source — Googlebot may not discover deeper pages without rendering.", rawValue: "0", renderedValue: String(rendered.internalLinksCount) });
  } else if (rendered.internalLinksCount > raw.internalLinksCount * 2 && rendered.internalLinksCount - raw.internalLinksCount >= 10) {
    add({ id: "links-mostly-js", severity: "warning", category: "Internal links", message: "A large share of internal links only appears after JavaScript rendering.", rawValue: String(raw.internalLinksCount), renderedValue: String(rendered.internalLinksCount) });
  }

  if (rendered.structuredDataTypes.length > 0 && raw.structuredDataTypes.length === 0) {
    add({ id: "sd-js-only", severity: "warning", category: "Structured data", message: "Structured data (JSON-LD) only appears after JavaScript rendering.", rawValue: null, renderedValue: rendered.structuredDataTypes.join(", ") });
  }

  if (rawTruncated) {
    // The raw HTML was cut off at the size cap — content-volume comparisons
    // would produce false "JS-only content" findings, so skip them.
    add({ id: "raw-truncated", severity: "info", category: "Content", message: `The raw HTML exceeded the ${Math.round(MAX_HTML_BYTES / 1024 / 1024)}MB analysis limit and was truncated; content-volume comparisons were skipped.`, rawValue: `${raw.wordCount}+ words (partial)`, renderedValue: `${rendered.wordCount} words` });
  } else if (raw.wordCount < 50 && rendered.wordCount >= 200) {
    add({ id: "content-js-only", severity: "critical", category: "Content", message: "The main text content is essentially absent without JavaScript. This is a classic client-side-rendered SPA pattern.", rawValue: `${raw.wordCount} words`, renderedValue: `${rendered.wordCount} words` });
  } else if (rendered.wordCount > raw.wordCount * 3 && rendered.wordCount - raw.wordCount > 300) {
    add({ id: "content-mostly-js", severity: "warning", category: "Content", message: "Most of the visible text is added by JavaScript rendering.", rawValue: `${raw.wordCount} words`, renderedValue: `${rendered.wordCount} words` });
  } else if (raw.wordCount < 20 && rendered.wordCount >= raw.wordCount * 3 + 20) {
    add({ id: "content-mostly-js", severity: "warning", category: "Content", message: "The raw HTML contains almost no text — most visible content is added by JavaScript rendering.", rawValue: `${raw.wordCount} words`, renderedValue: `${rendered.wordCount} words` });
  }

  if (rendered.imagesWithoutAlt > 0) {
    add({ id: "img-alt-missing", severity: "info", category: "Images", message: `${rendered.imagesWithoutAlt} of ${rendered.imagesTotal} images are missing alt text.`, rawValue: `${raw.imagesWithoutAlt}/${raw.imagesTotal}`, renderedValue: `${rendered.imagesWithoutAlt}/${rendered.imagesTotal}` });
  }

  if (jsErrors.length > 0) {
    add({ id: "js-errors", severity: "warning", category: "JavaScript", message: `${jsErrors.length} JavaScript error(s) occurred during rendering. Errors can prevent Googlebot from seeing the full page.`, rawValue: null, renderedValue: jsErrors[0] ?? null });
  }
  if (blockedResources.length > 0) {
    add({ id: "blocked-resources", severity: "info", category: "Resources", message: `${blockedResources.length} resource(s) failed to load during rendering.`, rawValue: null, renderedValue: blockedResources[0] ?? null });
  }
  if (redirectChain.length > 1) {
    add({ id: "redirect-chain", severity: "info", category: "HTTP", message: `The URL goes through ${redirectChain.length} redirects before resolving.`, rawValue: null, renderedValue: null });
  }
  if (httpStatus >= 400) {
    add({ id: "http-error", severity: "critical", category: "HTTP", message: `The page returned HTTP ${httpStatus}.`, rawValue: String(httpStatus), renderedValue: null });
  }

  const weights = { critical: 25, warning: 10, info: 3 } as const;
  const riskScore = Math.min(100, findings.reduce((acc, f) => acc + weights[f.severity], 0));
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
    criticalCount > 0 || riskScore >= 50 ? "HIGH" : riskScore >= 20 ? "MEDIUM" : "LOW";

  if (findings.length === 0) {
    add({ id: "all-clear", severity: "info", category: "Summary", message: "No significant differences between raw HTML and rendered DOM. The page is well set up for JavaScript SEO.", rawValue: null, renderedValue: null });
  }

  return { findings, riskLevel, riskScore };
}

export async function runRenderCheck(url: URL): Promise<CheckOutcome> {
  const rawResult = await fetchRaw(url);
  const renderedResult = await fetchRendered(rawResult.finalUrl);

  const raw = extractSnapshotFromHtml(rawResult.html, rawResult.finalUrl);
  const rendered = extractSnapshotFromHtml(renderedResult.html, rawResult.finalUrl);

  const { findings, riskLevel, riskScore } = compare(
    raw,
    rendered,
    rawResult.status,
    renderedResult.jsErrors,
    renderedResult.blockedResources,
    rawResult.redirectChain,
    rawResult.truncated,
  );

  return {
    finalUrl: rawResult.finalUrl,
    httpStatus: rawResult.status,
    riskLevel,
    riskScore,
    findings,
    raw,
    rendered,
    jsErrors: renderedResult.jsErrors,
    blockedResources: renderedResult.blockedResources,
    redirectChain: rawResult.redirectChain,
    renderMs: renderedResult.renderMs,
  };
}
