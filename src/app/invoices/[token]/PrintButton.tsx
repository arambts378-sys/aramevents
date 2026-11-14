'use client';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#17152B] px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
      Download PDF / Print
    </button>
  );
}
