import QRCode from 'qrcode';

/**
 * The hero's signature moment: an attendee registers, their QR ticket is issued,
 * a volunteer scans it, and it is stamped as checked in. Pure CSS timing, so it
 * runs once on load and is skipped entirely under prefers-reduced-motion.
 */
export async function EventPass() {
  const qrSvg = await QRCode.toString('https://aram.events', {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#1C1633', light: '#0000' },
  });

  return (
    <div className="relative mx-auto w-full max-w-[380px] lg:mr-0 xl:[zoom:1.1] 2xl:[zoom:1.3]" aria-label="Example ticket being checked in" role="img">
      {/* Registration line that feeds the ticket */}
      <div className="mk-rise mb-4 flex items-center gap-3 rounded-2xl border border-mk-line bg-white px-4 py-3 shadow-[0_10px_30px_-18px_rgba(36,27,94,0.45)]" style={{ animationDelay: '0.15s' }}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-mk-lilac font-display text-[0.8125rem] font-semibold text-mk-violet-strong">
          AR
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] text-mk-muted">New registration</p>
          <p className="mk-type truncate text-[0.875rem] font-semibold text-mk-ink" style={{ animationDelay: '0.45s' }}>
            Ananya Rao, General pass
          </p>
        </div>
        <span className="rounded-md bg-mk-lilac px-2 py-1 text-[0.6875rem] font-semibold text-mk-violet-strong">Confirmed</span>
      </div>

      {/* The ticket */}
      <div
        className="mk-rise relative overflow-hidden rounded-[22px] bg-mk-indigo text-white shadow-[0_30px_60px_-28px_rgba(36,27,94,0.8)]"
        style={{
          animationDelay: '1.2s',
          WebkitMaskImage:
            'radial-gradient(circle 13px at 0 calc(100% - 53px), transparent 12px, #000 13px), radial-gradient(circle 13px at 100% calc(100% - 53px), transparent 12px, #000 13px)',
          WebkitMaskComposite: 'source-in',
          maskImage:
            'radial-gradient(circle 13px at 0 calc(100% - 53px), transparent 12px, #000 13px), radial-gradient(circle 13px at 100% calc(100% - 53px), transparent 12px, #000 13px)',
          maskComposite: 'intersect',
        }}
      >
        <div className="px-6 pb-5 pt-6">
          <p className="text-[0.75rem] text-[#B9B0EE]">Sat 12 Dec 2026, 9:00 am</p>
          <p className="mt-1 font-display text-[1.625rem] font-semibold leading-[1.1] tracking-[-0.02em]">
            Hyderabad Design Week
          </p>
          <p className="mt-1 text-[0.875rem] text-[#CFC8F5]">HICC, Madhapur</p>

          <div className="mt-6 flex items-end gap-5">
            <div className="relative h-[132px] w-[132px] shrink-0 rounded-xl bg-white p-3">
              <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <span
                aria-hidden="true"
                className="mk-scan pointer-events-none absolute inset-x-1 top-0 h-[3px] rounded-full bg-mk-violet shadow-[0_0_14px_2px_rgba(109,80,245,0.8)]"
                style={{ animationDelay: '2.1s' }}
              />
            </div>
            <dl className="grid gap-3 pb-1 text-[0.8125rem]">
              <div>
                <dt className="text-[#9F95E3]">Attendee</dt>
                <dd className="font-semibold">Ananya Rao</dd>
              </div>
              <div>
                <dt className="text-[#9F95E3]">Ticket</dt>
                <dd className="font-semibold">General pass</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="border-t border-dashed border-white/25 px-6 py-4">
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="text-[#CFC8F5]">Main hall, Gate B</span>
            <span className="font-semibold">AE-20418</span>
          </div>
        </div>
      </div>

      {/* Admitted stamp */}
      <div
        className="mk-stamp absolute -right-2 bottom-24 rounded-xl border-2 border-mk-admit bg-white px-4 py-2 text-mk-admit shadow-[0_12px_30px_-14px_rgba(24,148,107,0.7)] sm:-right-8"
        style={{ animationDelay: '3.25s' }}
      >
        <p className="font-display text-[1.0625rem] font-semibold leading-none">Checked in</p>
        <p className="mt-1 text-[0.75rem] font-medium">9:42 am at Gate B</p>
      </div>
    </div>
  );
}
