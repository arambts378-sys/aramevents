import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getTrustedClientIp } from '@/lib/security/clientIp';
import { SITE_ASSISTANT_PROMPT, fallbackAnswer } from '@/lib/marketing/siteAssistant';

const MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 12;
const MAX_TEXT = 1000;

// Public endpoint: best-effort per-instance throttle keyed by IP.
const recent = new Map<string, number[]>();
function throttled(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 20;
}

type Incoming = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  if (throttled(getTrustedClientIp(req))) {
    return NextResponse.json({ error: 'Too many messages. Please wait a minute and try again.' }, { status: 429 });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is Incoming =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== ''
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TEXT) }));
  // The API requires the conversation to start and end with the visitor.
  while (history.length && history[0].role !== 'user') history.shift();
  const last = history[history.length - 1];
  if (!last || last.role !== 'user') {
    return NextResponse.json({ error: 'Type a question first.' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: fallbackAnswer(last.content) });
  }

  try {
    const response = await new Anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'low' },
      system: SITE_ASSISTANT_PROMPT,
      messages: history,
    });

    const reply = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
    if (response.stop_reason === 'refusal' || !reply) {
      return NextResponse.json({ reply: fallbackAnswer(last.content) });
    }
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Site assistant API error ${err.status}:`, err.message);
    } else {
      console.error('Site assistant failed', err);
    }
    // Keep the widget useful when the provider is down or rate limited.
    return NextResponse.json({ reply: fallbackAnswer(last.content) });
  }
}
