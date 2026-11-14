/**
 * Reads the `reply` string out of a structured-output JSON document that is still arriving.
 * `reply` is the schema's first field, so it streams before the draft. Returns the decoded
 * text so far, stopping before an escape sequence that has not fully arrived.
 */
export function partialReply(json: string): string {
  const key = /"reply"\s*:\s*"/.exec(json);
  if (!key) return '';
  let out = '';
  for (let i = key.index + key[0].length; i < json.length; i++) {
    const ch = json[i];
    if (ch === '"') break;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = json[i + 1];
    if (next === undefined) break;
    if (next === 'u') {
      const hex = json.slice(i + 2, i + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
      continue;
    }
    out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' } as Record<string, string>)[next] ?? next;
    i += 1;
  }
  return out;
}
