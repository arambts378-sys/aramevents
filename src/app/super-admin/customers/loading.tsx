export default function CustomerDirectoryLoading() {
  return (
    <section aria-label="Loading customer organizations" className="animate-pulse space-y-5">
      <div className="h-8 w-64 rounded bg-ds-line" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
      </div>
      <div className="h-16 rounded-xl bg-white" />
      <div className="h-72 rounded-xl bg-white" />
    </section>
  );
}
