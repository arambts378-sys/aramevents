import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { razorpayStatus } from '@/lib/payments/razorpay';

/** Tells organizers whether paid tickets can be sold online (no keys are ever returned). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  return NextResponse.json(await razorpayStatus(), { headers: { 'Cache-Control': 'no-store' } });
}
