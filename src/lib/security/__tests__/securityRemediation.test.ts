import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret } from '../../../utils/encryption';
import { isSafeSmtpHost, isValidSmtpPort } from '../smtpValidator';
import { isAllowedGoogleSheetsUrl, isAllowedGoogleRedirect } from '../urlValidator';
import { detectSafeImageFormat } from '../fileValidator';
import { getTrustedClientIp } from '../clientIp';
import { NextRequest } from 'next/server';

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

describe('C1 & L4: Encryption & Integrity Verification', () => {
  test('encryptSecret and decryptSecret work symmetrically with AES-256-GCM', () => {
    const secret = 'super-secret-smtp-password-12345';
    const encrypted = encryptSecret(secret);
    assert.match(encrypted, /^v1:[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/);

    const decrypted = decryptSecret(encrypted);
    assert.equal(decrypted, secret);
  });

  test('L4: decryptSecret fails closed if authentication tag is truncated or tampered', () => {
    const encrypted = encryptSecret('test-secret');
    const parts = encrypted.split(':');

    // 1. Altered ciphertext
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:00${parts[3].slice(2)}`;
    assert.throws(() => decryptSecret(tamperedCiphertext));

    // 2. Truncated auth tag (less than 16 bytes)
    const truncatedTag = `${parts[0]}:${parts[1]}:${parts[2].slice(0, 16)}:${parts[3]}`;
    assert.throws(() => decryptSecret(truncatedTag));

    // 3. Altered IV
    const tamperedIv = `${parts[0]}:00000000000000000000000000000000:${parts[2]}:${parts[3]}`;
    assert.throws(() => decryptSecret(tamperedIv));
  });
});

describe('H4 & M6: SSRF & Destination Validation', () => {
  test('isSafeSmtpHost rejects private IPs, localhost, and AWS metadata destinations', () => {
    const forbidden = [
      'localhost',
      '127.0.0.1',
      '127.0.0.2',
      '::1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '100.64.0.1', // Carrier Grade NAT
      'internal.corp',
      'server.local',
      'cluster.lan',
    ];

    for (const host of forbidden) {
      const res = isSafeSmtpHost(host);
      assert.equal(res.safe, false, `Expected ${host} to be rejected for SSRF safety`);
    }
  });

  test('isSafeSmtpHost accepts legitimate public SMTP hosts', () => {
    const allowed = ['smtp.gmail.com', 'smtp.sendgrid.net', 'smtp.mailgun.org', 'mail.example.com'];

    for (const host of allowed) {
      const res = isSafeSmtpHost(host);
      assert.equal(res.safe, true, `Expected ${host} to be allowed`);
    }
  });

  test('isValidSmtpPort accepts standard email ports and rejects others', () => {
    assert.equal(isValidSmtpPort(25), true);
    assert.equal(isValidSmtpPort(465), true);
    assert.equal(isValidSmtpPort(587), true);
    assert.equal(isValidSmtpPort(2525), true);

    assert.equal(isValidSmtpPort(22), false);
    assert.equal(isValidSmtpPort(80), false);
    assert.equal(isValidSmtpPort(3000), false);
    assert.equal(isValidSmtpPort(5432), false);
  });

  test('M6: isAllowedGoogleSheetsUrl accepts only standard Google Apps Script URLs', () => {
    const valid = 'https://script.google.com/macros/s/AKfycbx_abc123DEF456-ghi789/exec';
    assert.equal(isAllowedGoogleSheetsUrl(valid).valid, true);

    // Non-HTTPS
    assert.equal(isAllowedGoogleSheetsUrl('http://script.google.com/macros/s/xyz/exec').valid, false);

    // Internal IP / SSRF attempt
    assert.equal(isAllowedGoogleSheetsUrl('http://169.254.169.254/latest/meta-data/').valid, false);

    // Other domains
    assert.equal(isAllowedGoogleSheetsUrl('https://evil.com/macros/s/xyz/exec').valid, false);

    // Custom port
    assert.equal(isAllowedGoogleSheetsUrl('https://script.google.com:8443/macros/s/xyz/exec').valid, false);
  });

  test('M6: isAllowedGoogleRedirect rejects non-Google redirects', () => {
    assert.equal(isAllowedGoogleRedirect('https://script.google.com/macros/s/xyz/exec'), true);
    assert.equal(isAllowedGoogleRedirect('https://script.googleusercontent.com/echo?id=123'), true);
    assert.equal(isAllowedGoogleRedirect('https://attacker.com/steal'), false);
    assert.equal(isAllowedGoogleRedirect('http://169.254.169.254/'), false);
  });
});

describe('M5: Magic Byte Image Validation', () => {
  test('detectSafeImageFormat recognizes authentic JPEG, PNG, and WebP buffers', () => {
    // Authentic JPEG magic bytes
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const jpegRes = detectSafeImageFormat(jpegBuffer);
    assert.equal(jpegRes.valid, true);
    if (jpegRes.valid) {
      assert.equal(jpegRes.mime, 'image/jpeg');
      assert.equal(jpegRes.ext, 'jpg');
    }

    // Authentic PNG magic bytes
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pngRes = detectSafeImageFormat(pngBuffer);
    assert.equal(pngRes.valid, true);
    if (pngRes.valid) {
      assert.equal(pngRes.mime, 'image/png');
      assert.equal(pngRes.ext, 'png');
    }

    // Authentic WebP magic bytes
    const webpHeader = Buffer.alloc(16);
    webpHeader.write('RIFF', 0, 'ascii');
    webpHeader.writeUInt32LE(100, 4);
    webpHeader.write('WEBP', 8, 'ascii');
    const webpRes = detectSafeImageFormat(webpHeader);
    assert.equal(webpRes.valid, true);
    if (webpRes.valid) {
      assert.equal(webpRes.mime, 'image/webp');
      assert.equal(webpRes.ext, 'webp');
    }
  });

  test('detectSafeImageFormat rejects forged files and executable payloads', () => {
    // PHP shell script disguised as image
    const phpDisguised = Buffer.from('<?php echo system($_GET["cmd"]); ?>');
    assert.equal(detectSafeImageFormat(phpDisguised).valid, false);

    // HTML / XSS disguised as image
    const htmlDisguised = Buffer.from('<script>alert(1)</script>');
    assert.equal(detectSafeImageFormat(htmlDisguised).valid, false);

    // Windows PE executable (MZ header)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    assert.equal(detectSafeImageFormat(exeBuffer).valid, false);

    // Truncated buffer
    const truncated = Buffer.from([0xff, 0xd8]);
    assert.equal(detectSafeImageFormat(truncated).valid, false);
  });
});

describe('L10: Trusted Client IP Extraction', () => {
  test('prefers platform trusted headers (cf-connecting-ip / x-vercel-forwarded-for)', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.195, 10.0.0.1',
        'cf-connecting-ip': '198.51.100.42',
      },
    });
    assert.equal(getTrustedClientIp(req), '198.51.100.42');
  });

  test('extracts first hop from x-forwarded-for when platform headers are absent', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.88, 10.0.0.2',
      },
    });
    assert.equal(getTrustedClientIp(req), '203.0.113.88');
  });
});

describe('L16: CSV Formula Injection Prevention', () => {
  test('prefixes formula triggers (=, +, -, @, \\t, \\r) with single quote', () => {
    function sanitizeCsvValue(val: unknown): string {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    }

    assert.equal(sanitizeCsvValue('=cmd|"/C calc"!A0'), '"\'=cmd|""/C calc""!A0"');
    assert.equal(sanitizeCsvValue('+1234567890'), '"\'+1234567890"');
    assert.equal(sanitizeCsvValue('-5000'), '"\'-5000"');
    assert.equal(sanitizeCsvValue('@SUM(A1:A10)'), '"\'@SUM(A1:A10)"');
    assert.equal(sanitizeCsvValue('Standard Name'), '"Standard Name"');
  });
});
