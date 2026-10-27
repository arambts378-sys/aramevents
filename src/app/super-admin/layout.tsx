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

  return (
    <div className="flex min-h-screen w-full flex-col bg-ds-canvas text-ds-ink md:flex-row">
      <MasterAdminSidebar adminEmail={user.email || 'admin@arambts.internal'} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="ds-container flex-1 py-5 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
