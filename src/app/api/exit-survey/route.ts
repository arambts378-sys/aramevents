import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTrustedClientIp } from '@/lib/security/clientIp';
import { EXIT_COMMENT_MAX, isExitReason } from '@/lib/marketing/exitSurvey';

// Public endpoint: best-effort per-instance throttle. A visitor answers once per session.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
function throttled(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 5;
}

export async function POST(req: NextRequest) {
  if (throttled(getTrustedClientIp(req))) {
    return NextResponse.json({ error: 'Thanks, we already have your answer.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!isExitReason(body.reason)) {
    return NextResponse.json({ error: 'Pick one of the reasons.' }, { status: 400 });
  }
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, EXIT_COMMENT_MAX) : '';
  const page = typeof body.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 300) : null;
  const device = body.device === 'mobile' || body.device === 'desktop' ? body.device : null;

  try {
    const { error } = await createAdminClient()
      .from('exit_survey_responses')
      .insert({ reason: body.reason, comment: comment || null, page_path: page, device });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Exit survey could not be saved', err);
    return NextResponse.json({ error: 'Your answer could not be saved right now.' }, { status: 503 });
  }
}
