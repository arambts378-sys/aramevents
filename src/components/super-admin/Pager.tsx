import Link from 'next/link';
import { pageHref } from './fmt';

export function Pager({
  base,
  params,
  page,
  pageSize,
  total,
  noun,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-ds-line px-4 py-3 text-[13px] text-ds-muted sm:px-5">
      <span className="tabular-nums">
        {from}–{to} of {total.toLocaleString('en')} {noun}
      </span>
      <span className="flex gap-2">
        <Link
          href={pageHref(base, params, page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={`ds-btn ds-btn-secondary ds-btn-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
        >
          Previous
        </Link>
        <Link
          href={pageHref(base, params, page + 1)}
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
          className={`ds-btn ds-btn-secondary ds-btn-sm ${page >= pages ? 'pointer-events-none opacity-50' : ''}`}
        >
          Next
        </Link>
      </span>
    </nav>
  );
}

/** Segmented filter rendered as links so it works without JavaScript. */
export function FilterTabs({
  base,
  params,
  name,
  active,
  options,
}: {
  base: string;
  params: Record<string, string | undefined>;
  name: string;
  active: string;
  options: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <nav aria-label="Filter" className="flex gap-1 overflow-x-auto rounded-lg border border-ds-line bg-ds-subtle p-1">
      {options.map((o) => {
        const on = o.value === active;
        return (
          <Link
            key={o.value}
            href={pageHref(base, { ...params, [name]: o.value === 'all' ? undefined : o.value })}
            aria-current={on ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-ds-accent ${
              on ? 'bg-ds-surface font-medium text-ds-ink shadow-xs' : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 tabular-nums text-ds-muted">{o.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function SearchBox({ base, params, placeholder }: { base: string; params: Record<string, string | undefined>; placeholder: string }) {
  return (
    <form action={base} className="relative w-full sm:w-72">
      {Object.entries(params).map(([k, v]) => (v && k !== 'q' && k !== 'page' ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted" aria-hidden="true">search</span>
      <input type="search" name="q" defaultValue={params.q} placeholder={placeholder} aria-label={placeholder} className="ds-input pl-9" />
    </form>
  );
}
