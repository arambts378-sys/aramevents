import Link from 'next/link';

export default function SuperAdminForbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-4 text-[#17152B]">
      <section className="w-full max-w-md rounded-2xl border border-[#E6E2F0] bg-white p-6 text-center shadow-xs sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">403 · Access denied</p>
        <h1 className="mt-3 font-space text-2xl font-bold">Platform access required</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#686477]">
          Your account does not have permission to access platform administration.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-lg bg-[#7C5CFC] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5B3FE8]"
        >
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
