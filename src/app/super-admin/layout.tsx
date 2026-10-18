import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';

const navigation = [
  { href: '/super-admin', label: 'Overview' },
  { href: '/super-admin/customers', label: 'Customers' },
  { href: '/super-admin/activity', label: 'Activity' },
  { href: '/super-admin/support', label: 'Support' },
  { href: '/super-admin/audit-logs', label: 'Audit Logs' },
];

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Failed to authenticate Super Admin route:', error);
    redirect('/login?next=%2Fsuper-admin');
  }
  if (!user) redirect('/login?next=%2Fsuper-admin');

  const access = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error: permissionError } = await supabase.rpc('has_platform_permission', {
      p_permission: 'console.view',
    });
    return { data, error: permissionError };
  });

  if (access !== 'allowed') forbidden();

  const customerAccess = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error: permissionError } = await supabase.rpc('has_platform_permission', {
      p_permission: 'customers.read',
    });
    return { data, error: permissionError };
  });
  const activityAccess = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error: permissionError } = await supabase.rpc('has_platform_permission', {
      p_permission: 'activity.read',
    });
    return { data, error: permissionError };
  });
  const visibleNavigation = navigation.filter(
    (item) =>
      (item.href !== '/super-admin/customers' || customerAccess === 'allowed') &&
      (item.href !== '/super-admin/activity' || activityAccess === 'allowed'),
  );

  return (
    <div className="min-h-screen bg-[#F7F5FF] text-[#17152B]">
      <header className="border-b border-[#E6E2F0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link href="/super-admin" className="font-space text-lg font-bold tracking-tight">
            ARAM BTS <span className="text-[#7C5CFC]">Platform Admin</span>
          </Link>
          <nav aria-label="Super Admin navigation" className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:pb-0">
            {visibleNavigation.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#5A566B] transition-colors hover:bg-[#F1EDFF] hover:text-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
