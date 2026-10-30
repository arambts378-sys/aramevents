/** Quote a value for CSV, prefixing a quote to cells that spreadsheets would run as formulas (L16). */
export function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/** Build a CSV and hand it to the browser as a download. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csvContent = [headers, ...rows].map((r) => r.map(sanitizeCsvValue).join(',')).join('\r\n');
  // The BOM makes Excel read the file as UTF-8, so non-latin names survive.
  const blob = new Blob(['﻿', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
