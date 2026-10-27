import { notFound } from 'next/navigation';

const sections: Record<string, string> = {
  activity: 'Activity',
  support: 'Support',
  'audit-logs': 'Audit Logs',
};

export default async function SuperAdminPlaceholderPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const label = sections[section];
  if (!label) notFound();

  return (
    <section className="ds-card p-5 shadow-xs sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-ds-accent">Phase 1 placeholder</p>
      <h1 className="mt-2 font-space text-2xl font-bold tracking-tight sm:text-3xl">{label}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ds-muted">
        This area is reserved for a later phase and has no operational functionality yet.
      </p>
    </section>
  );
}
