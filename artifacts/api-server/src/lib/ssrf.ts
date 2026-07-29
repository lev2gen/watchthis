import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

const PRIVATE_V4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["192.0.0.0", 24],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
];

function isPrivateV4(ip: string): boolean {
  const val = ipToLong(ip);
  return PRIVATE_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (val & mask) === (ipToLong(base) & mask);
  });
}

function isPrivateV6(ip: string): boolean {
  const low = ip.toLowerCase();
  return (
    low === "::" ||
    low === "::1" ||
    low.startsWith("fc") ||
    low.startsWith("fd") ||
    low.startsWith("fe80") ||
    low.startsWith("::ffff:")
  );
}

export class SsrfError extends Error {}

// Short-lived DNS verdict cache so per-resource checks during rendering stay fast.
const dnsVerdictCache = new Map<string, { expiresAt: number; ok: boolean }>();
const DNS_CACHE_TTL_MS = 30_000;

/**
 * Validates a user-supplied URL for the checker:
 * - http/https only
 * - no credentials
 * - hostname must not resolve to a private/reserved IP
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with credentials are not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new SsrfError("Private hostnames are not allowed");
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateV4(host)) throw new SsrfError("Private IP addresses are not allowed");
  if (ipVersion === 6 && isPrivateV6(host)) throw new SsrfError("Private IP addresses are not allowed");
  if (ipVersion === 0) {
    const cached = dnsVerdictCache.get(host);
    if (cached && cached.expiresAt > Date.now()) {
      if (!cached.ok) throw new SsrfError("Hostname resolves to a private IP");
      return url;
    }
    let addresses;
    try {
      addresses = await lookup(host, { all: true });
    } catch {
      throw new SsrfError("Hostname could not be resolved");
    }
    const isPrivate = addresses.some(
      ({ address, family }) =>
        (family === 4 && isPrivateV4(address)) || (family === 6 && isPrivateV6(address)),
    );
    dnsVerdictCache.set(host, { expiresAt: Date.now() + DNS_CACHE_TTL_MS, ok: !isPrivate });
    if (dnsVerdictCache.size > 5000) dnsVerdictCache.clear();
    if (isPrivate) throw new SsrfError("Hostname resolves to a private IP");
  }
  return url;
}
