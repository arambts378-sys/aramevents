'use client';

import React from 'react';

export function RegistrationTicketFlow() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8 bg-white">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold text-ds-accent uppercase tracking-wider">03 / REGISTER</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-ds-body mt-1 tracking-tight">
          Flexible Registration for Every Audience.
        </h2>
        <p className="text-base text-ds-muted mt-2 font-normal">
          A frictionless 3-step registration journey converting web visits directly into cryptographically verified digital wallet passes.
        </p>
      </div>

      {/* 3-Step Visual Connected Sequence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative items-stretch">
        {/* Step A: Registration Form */}
        <div className="bg-ds-canvas p-6 rounded-2xl border border-ds-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold bg-ds-accent-soft text-ds-accent px-2.5 py-1 rounded-md">
                STEP A: REGISTRATION
              </span>
              <span className="material-symbols-outlined text-ds-muted">edit_note</span>
            </div>
            <h4 className="text-xl font-bold text-ds-body mb-2">Custom Attendee Form</h4>
            <p className="text-xs text-ds-muted mb-6 font-normal">
              Dynamic conditional fields for dietary, track interests, and credentials.
            </p>

            {/* Mock Form UI */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-ds-line">
              <div>
                <span className="text-[11px] text-ds-muted block">Full Name</span>
                <div className="text-xs font-bold text-ds-body">Priya Sharma</div>
              </div>
              <div>
                <span className="text-[11px] text-ds-muted block">Work Email</span>
                <div className="text-xs font-semibold text-ds-body">priya@horizonlabs.ai</div>
              </div>
              <div>
                <span className="text-[11px] text-ds-muted block">Organization</span>
                <div className="text-xs font-semibold text-ds-body">Horizon Labs Research</div>
              </div>
              <div>
                <span className="text-[11px] text-ds-muted block">Pass Type</span>
                <div className="text-xs font-bold text-ds-accent">VIP All-Access + Masterclass</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#22C55E]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified_user</span> Instant 1-Click Fill
            </span>
            <span>Form Complete</span>
          </div>
        </div>

        {/* Step B: Instant Checkout Confirmation */}
        <div className="bg-ds-canvas p-6 rounded-2xl border border-ds-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold bg-ds-accent-soft text-ds-accent px-2.5 py-1 rounded-md">
                STEP B: CHECKOUT
              </span>
              <span className="material-symbols-outlined text-ds-muted">credit_card</span>
            </div>
            <h4 className="text-xl font-bold text-ds-body mb-2">Instant Verification</h4>
            <p className="text-xs text-ds-muted mb-6 font-normal">
              Multi-currency gateway with sub-second payment settlement and tax receipting.
            </p>

            {/* Mock Receipt UI */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-ds-line">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-ds-muted">Payment Method</span>
                <span className="text-xs font-bold text-ds-body">Apple Pay (•• 8821)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-ds-muted">Transaction Status</span>
                <span className="text-[10px] bg-[#22C55E]/15 text-[#22C55E] font-bold px-2 py-0.5 rounded">
                  Settled (180ms)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-ds-muted">Invoice ID</span>
                <span className="text-xs font-mono text-ds-body">#ARAM-2026-9042</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-ds-line">
                <span className="text-xs font-bold text-ds-body">Total Authorized</span>
                <span className="text-base font-bold text-ds-accent font-mono">$499.00 USD</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-ds-muted">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-sm">lock</span> 256-Bit TLS Encrypted
            </span>
            <span className="text-[#22C55E] font-bold">Verified</span>
          </div>
        </div>

        {/* Step C: Sleek Digital Wallet Pass */}
        <div className="bg-ds-canvas p-6 rounded-2xl border-2 border-ds-accent/40 shadow-xl shadow-black/5 flex flex-col justify-between relative">
          <div className="absolute -top-3 right-6 bg-ds-accent text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
            ISSUED PASS
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold bg-ds-accent-soft text-ds-accent px-2.5 py-1 rounded-md">
                STEP C: DIGITAL PASS
              </span>
              <span className="material-symbols-outlined text-ds-accent">qr_code_2</span>
            </div>
            <h4 className="text-xl font-bold text-ds-body mb-2">Cryptographic Mobile Pass</h4>
            <p className="text-xs text-ds-muted mb-4 font-normal">
              Dynamic barcode with Apple and Google Wallet pass sync support.
            </p>

            {/* Perforated QR Pass Card Design */}
            <div className="bg-ds-ink text-white rounded-xl p-4 shadow-inner relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/20 pb-3 mb-3">
                <div>
                  <span className="text-[10px] text-[#EDE9FE] font-bold">ARAM BTS VERIFIED</span>
                  <div className="text-xs font-bold text-white">Priya Sharma</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-ds-accent text-white text-[10px] font-bold">VIP PASS</span>
              </div>

              {/* QR Container */}
              <div className="bg-white p-3 rounded-lg flex flex-col items-center justify-center my-2">
                <div className="w-28 h-28 bg-ds-ink p-2 rounded flex flex-col items-center justify-center text-white">
                  <span className="material-symbols-outlined text-5xl">qr_code_2</span>
                  <span className="text-[8px] font-mono tracking-widest text-[#EDE9FE] mt-0.5">SEC-KEY-9281</span>
                </div>
                <span className="text-[9px] text-ds-muted font-mono mt-1">DYNAMIC ROLLING TOKEN • 45s</span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#EDE9FE] pt-2 border-t border-white/20">
                <span>Hall A • VIP Lounge</span>
                <span className="text-[#22C55E] font-bold">Gate 1 & 4</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-ds-body">
              <span className="material-symbols-outlined text-base">wallet</span> Add to Apple Wallet
            </span>
            <span className="text-ds-accent font-bold">Ready for Ingress</span>
          </div>
        </div>
      </div>
    </section>
  );
}
