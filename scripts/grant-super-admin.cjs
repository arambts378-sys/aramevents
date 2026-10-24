const fs = require('fs');
const path = require('path');

// Try loading .env if process.env variables are missing
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = process.argv[2] || process.env.SUPER_ADMIN_EMAIL || 'praveenkumararam@gmail.com';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function grantSuperAdmin() {
  const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Step 1: Find user by email via Admin API
  console.log(`\n🔍 Looking up user: ${TARGET_EMAIL}`);
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
  const listData = await listRes.json();

  if (!listRes.ok) {
    console.error('❌ Failed to list users:', listData);
    process.exit(1);
  }

  const user = (listData.users || []).find(u => u.email === TARGET_EMAIL);
  if (!user) {
    console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (id: ${user.id})`);

  // Step 2: Check if already in platform_roles
  console.log('\n🔍 Checking existing platform_roles...');
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/platform_roles?user_id=eq.${user.id}&select=user_id,role,is_active`,
    { headers }
  );

  // Step 3: Try provision_initial_super_admin RPC first
  console.log('\n🚀 Calling provision_initial_super_admin...');
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/provision_initial_super_admin`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_actor_user_id: user.id,
      p_target_user_id: user.id,
    }),
  });

  const rpcData = await rpcRes.text();
  console.log(`   Status: ${rpcRes.status}`, rpcData);

  if (rpcRes.ok) {
    console.log('\n✅ Super admin provisioned successfully via RPC!');
    return;
  }

  // Step 4: If RPC failed (e.g. already provisioned), try direct upsert via service_role
  console.log('\n⚡ RPC failed — trying direct upsert via service_role...');

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_roles`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      user_id: user.id,
      role: 'super_admin',
      is_active: true,
    }),
  });

  const upsertText = await upsertRes.text();
  console.log(`   Upsert status: ${upsertRes.status}`, upsertText);

  if (upsertRes.ok || upsertRes.status === 201 || upsertRes.status === 204) {
    console.log(`\n✅ platform_roles upserted: ${TARGET_EMAIL} → super_admin`);
  } else {
    console.error('\n❌ Direct upsert also failed. Check Supabase RLS on platform_roles.');
    process.exit(1);
  }

  // Step 5: Verify
  console.log('\n🔍 Verifying...');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/platform_roles?user_id=eq.${user.id}&select=user_id,role,is_active`,
    { headers }
  );
  const verifyData = await verifyRes.json();
  console.log('   platform_roles entry:', JSON.stringify(verifyData, null, 2));
  console.log('\n🎉 Done! Log in at http://localhost:3000/super-admin/login');
}

grantSuperAdmin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
