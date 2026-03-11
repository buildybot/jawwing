/**
 * ssrf-guard.ts
 * URL validation to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Checks:
 * 1. Only http/https schemes allowed
 * 2. DNS resolution before fetch — resolved IP must not be private/internal
 * 3. Blocks RFC-1918 private ranges, loopback, link-local (AWS metadata), etc.
 */

import dns from "dns/promises";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

/** Returns true if the IPv4 address is in a private/internal range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // unparseable → treat as blocked
  }
  const [a, b, c] = parts;
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (AWS metadata)
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 shared address space
    a === 0 || // 0.0.0.0/8
    a >= 240 // 240.0.0.0/4 reserved
  );
}

/** Returns true if the IPv6 address is private/internal. */
function isPrivateIPv6(ip: string): boolean {
  // Normalize: strip brackets if present
  const addr = ip.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    addr === "::1" || // loopback
    addr.startsWith("fc") || // fc00::/7 unique-local
    addr.startsWith("fd") || // fc00::/7 unique-local
    addr.startsWith("fe80") || // fe80::/10 link-local
    addr === "::" // unspecified
  );
}

function isPrivateIP(ip: string): boolean {
  if (ip.includes(":")) return isPrivateIPv6(ip);
  return isPrivateIPv4(ip);
}

/**
 * Validates a URL for SSRF safety.
 * - Checks scheme
 * - Resolves hostname via DNS
 * - Rejects if any resolved address is private/internal
 *
 * Returns the normalized URL string if safe, or null if blocked.
 */
export async function validateUrl(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // 1. Scheme check
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return null;
  }

  // 2. Must have a hostname
  const hostname = parsed.hostname;
  if (!hostname) return null;

  // 3. Block numeric IP literals directly (no DNS needed)
  if (isPrivateIP(hostname)) return null;

  // 4. DNS resolution — check ALL returned addresses (DNS rebinding protection)
  try {
    const addresses: string[] = [];

    try {
      const ipv4Results = await dns.resolve4(hostname);
      addresses.push(...ipv4Results);
    } catch {
      // hostname may not have A records
    }

    try {
      const ipv6Results = await dns.resolve6(hostname);
      addresses.push(...ipv6Results);
    } catch {
      // hostname may not have AAAA records
    }

    // If we couldn't resolve at all, block it
    if (addresses.length === 0) return null;

    // If ANY resolved address is private, block
    for (const addr of addresses) {
      if (isPrivateIP(addr)) return null;
    }
  } catch {
    // DNS lookup failure → block
    return null;
  }

  return parsed.href;
}
