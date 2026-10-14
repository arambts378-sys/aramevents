import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const eventId = '476eaa59-a279-4a93-a3de-debdfd4924cc';
  const { data: settings } = await supabase.from('event_registration_settings').select('*').eq('event_id', eventId).maybeSingle();
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();

  fs.writeFileSync(
    'C:/Users/santh/.gemini/antigravity/brain/9c506094-1d96-41c2-9978-6e73c64bc6b9/scratch/check_db_result.json',
    JSON.stringify({ settings, event }, null, 2)
  );
  console.log('Written result');
}
check();
