import { NextResponse } from 'next/server';
import { processIntegrationJobs } from '@/services/integrations/processor';
import { checkCronAuthorization } from '@/lib/security/cronAuthorization';

function safeCompare(a: string, b: string): boolean {
  return checkCronAuthorization(`Bearer ${a}`, b) === 'authorized';
}

async function handleProcess(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = checkCronAuthorization(
      req.headers.get('authorization'),
      cronSecret
    );
    if (authorization === 'misconfigured') {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    
    // Enforce Bearer token authentication if CRON_SECRET is configured
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const token = authHeader.substring(7);
      if (!safeCompare(token, cronSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await processIntegrationJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Integration Job Processing Error:', errorMsg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleProcess(req);
}

export async function GET(req: Request) {
  return handleProcess(req);
}
