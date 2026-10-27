'use client';

import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';

/* Instant navigation feedback for workspace pages: the sidebar (with the new
   route already highlighted) plus a lightweight skeleton while the page loads. */
export default function WorkspaceLoading() {
  const { currentUser } = useAppContext();

  return (
    <div className="h-full bg-ds-canvas text-ds-ink min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full">
        <Sidebar currentUser={currentUser} />
        <main
          className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8"
          aria-busy="true"
          aria-label="Loading"
        >
          <div className="w-full animate-pulse">
            <div className="border-b border-ds-line pb-5">
              <div className="h-7 w-40 rounded-md bg-ds-ink/[0.07]" />
              <div className="mt-2.5 h-4 w-72 max-w-full rounded-md bg-ds-ink/[0.05]" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl border border-ds-line bg-white" />
              ))}
            </div>
            <div className="mt-6 h-64 rounded-xl border border-ds-line bg-white" />
          </div>
        </main>
      </div>
    </div>
  );
}
