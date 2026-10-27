import Link from 'next/link';

export default function SuperAdminForbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ds-canvas px-4 text-ds-ink">
      <section className="w-full max-w-md ds-card p-6 text-center shadow-xs sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-ds-accent">403 · Access denied</p>
        <h1 className="mt-3 font-space text-2xl font-bold">Platform access required</h1>
        <p className="mt-3 text-sm leading-relaxed text-ds-muted">
          Your account does not have permission to access platform administration.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-lg bg-ds-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-ds-accent-strong"
        >
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
