import { NextRequest } from 'next/server';

/**
 * Resolves trusted client IP from platform hosting headers (L10).
 * Checks platform-specific headers first (Vercel, Cloudflare) before fallback.
 */
export function getTrustedClientIp(req: NextRequest | Request): string {
  const headers = req.headers;

  // 1. Vercel hosting platform header
  const vercelIp = headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    const ip = vercelIp.split(',')[0].trim();
    if (isValidIp(ip)) return ip;
  }

  // 2. Cloudflare hosting header
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 3. X-Real-IP
  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 4. Standard X-Forwarded-For (take the leftmost valid IP)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (isValidIp(part)) {
        return part;
      }
    }
  }

  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // IPv4 or IPv6 basic validation
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}
