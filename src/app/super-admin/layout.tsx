import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import { MasterAdminSidebar } from '@/components/super-admin/MasterAdminSidebar';

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const reqHeaders = await headers();
  const pathname = reqHeaders.get('x-pathname') || '';

  // Exclude dedicated admin login route from protected admin chrome
  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/super-admin/login?next=%2Fsuper-admin');
  }

  const access = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error: permissionError } = await supabase.rpc('has_platform_permission', {
      p_permission: 'console.view',
    });
    return { data, error: permissionError };
  });

  if (access !== 'allowed') {
    forbidden();
  }

  const { data: adminRole } = await supabase.rpc('get_my_platform_role');
  const resolvedRole = adminRole || 'support';

  return (
    <div className="min-h-screen bg-[#F7F5FF] text-[#17152B] flex flex-col md:flex-row w-full">
      <MasterAdminSidebar
        adminEmail={user.email || 'admin@arambts.internal'}
        adminRole={resolvedRole}
      />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
