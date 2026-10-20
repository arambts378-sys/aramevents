import net from 'net';

/**
 * Validates whether an SMTP host and port are safe to connect to,
 * preventing SSRF and internal network scanning.
 */
export function isSafeSmtpHost(host: string | null | undefined): { safe: boolean; reason?: string } {
  if (!host || typeof host !== 'string') {
    return { safe: false, reason: 'SMTP host is required.' };
  }

  const trimmed = host.trim().toLowerCase();

  // Strip brackets if IPv6
  const cleanHost = trimmed.replace(/^\[|\]$/g, '');

  // Reject local and internal domain patterns
  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal') ||
    cleanHost.endsWith('.lan') ||
    cleanHost.endsWith('.corp') ||
    cleanHost.endsWith('.home')
  ) {
    return { safe: false, reason: 'Connecting to local or internal hostnames is prohibited.' };
  }

  // Check if it's an IP address
  const ipVersion = net.isIP(cleanHost);

  if (ipVersion === 4) {
    if (isPrivateIPv4(cleanHost)) {
      return { safe: false, reason: 'Connecting to private or link-local IP addresses is prohibited.' };
    }
  } else if (ipVersion === 6) {
    if (isPrivateIPv6(cleanHost)) {
      return { safe: false, reason: 'Connecting to private or loopback IPv6 addresses is prohibited.' };
    }
  } else {
    // Validate domain syntax
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleanHost)) {
      return { safe: false, reason: 'Invalid SMTP hostname format.' };
    }
  }

  return { safe: true };
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (Shared address space)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224) return true;

  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified ::
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  // Unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local addresses (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  // IPv4-mapped IPv6
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.slice(7);
    return isPrivateIPv4(ipv4);
  }

  return false;
}

export function isValidSmtpPort(port: unknown): boolean {
  const p = typeof port === 'number' ? port : parseInt(String(port), 10);
  if (isNaN(p) || p <= 0 || p > 65535) return false;
  // Standard SMTP ports
  return [25, 465, 587, 2525].includes(p);
}
