export default function SuperAdminActivityLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-3">
        <div className="h-3 w-36 animate-pulse rounded bg-[#E6E2F0]" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded bg-[#E6E2F0]" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-[#E6E2F0]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl border border-[#E6E2F0] bg-white" />
        <div className="h-24 animate-pulse rounded-xl border border-[#E6E2F0] bg-white" />
      </div>
      <div className="h-56 animate-pulse rounded-2xl border border-[#E6E2F0] bg-white" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border border-[#E6E2F0] bg-white" />
        ))}
      </div>
    </div>
  );
}
