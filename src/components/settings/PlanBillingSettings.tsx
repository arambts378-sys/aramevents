'use client';

import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { getWorkspacePlan } from '@/app/actions/planActions';
import {
  formatPlanPrice,
  getPlanCta,
  getPlanDefinitions,
  getSubscriptionStatusLabel,
} from '@/services/planService';
import type { PlanErrorCode, ResolvedWorkspacePlan } from '@/types/subscription';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; plan: ResolvedWorkspacePlan }
  | { kind: 'error'; code: PlanErrorCode; message: string };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(inGoodStanding: boolean): string {
  return inGoodStanding
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-amber-50 border-amber-200 text-amber-800';
}

export function PlanBillingSettings() {
  const { activeWorkspace } = useAppContext();
  const workspaceId = activeWorkspace?.id ?? null;
  const [result, setResult] = useState<{ workspaceId: string; state: LoadState } | null>(null);
  // Loading whenever the latest result belongs to a different (or no) workspace.
  const state: LoadState = result && result.workspaceId === workspaceId ? result.state : { kind: 'loading' };

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    getWorkspacePlan(workspaceId)
      .then((res) => {
        if (cancelled) return;
        setResult({ workspaceId, state: res.ok ? { kind: 'ready', plan: res.data } : { kind: 'error', ...res.error } });
      })
      .catch(() => {
        if (!cancelled)
          setResult({ workspaceId, state: { kind: 'error', code: 'lookup_failed', message: 'Unable to load plan details. Please try again.' } });
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const plans = getPlanDefinitions();

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">PLAN &amp; BILLING</span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">Your Workspace Plan</h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            View the plan assigned to {activeWorkspace?.name ? <strong className="text-[#17152B]">{activeWorkspace.name}</strong> : 'your workspace'} and what it includes.
          </p>
        </div>

        {(state.kind === 'loading' || !workspaceId) && (
          <div className="mt-6 flex items-center gap-2.5 text-[13px] text-[#77738A] font-jakarta" role="status">
            <span className="w-3.5 h-3.5 border-2 border-[#7C5CFC]/30 border-t-[#7C5CFC] rounded-full animate-spin"></span>
            <span>Loading plan details…</span>
          </div>
        )}

        {state.kind === 'error' && workspaceId && (
          <div
            className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 text-[13px] font-jakarta"
            role="alert"
          >
            <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
            <span>{state.message}</span>
          </div>
        )}

        {state.kind === 'ready' && workspaceId && (() => {
          const { plan } = state;
          const sub = plan.subscription;
          const periodEnd = formatDate(sub.currentPeriodEnd);
          const trialEnd = formatDate(sub.trialEndsAt);
          const effective = plans.find((p) => p.id === plan.effectivePlanId)!;
          return (
            <div className="mt-6 space-y-5" data-testid="current-plan">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#FAF9FF] border border-[#E6E2F0]">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[22px] font-bold text-[#17152B] font-space" id="current-plan-name">
                      {plan.assignedPlan.name}
                    </span>
                    <span
                      id="current-plan-status"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono font-medium ${statusTone(plan.inGoodStanding)}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {sub.isDefault ? 'Active · Default' : getSubscriptionStatusLabel(sub.status)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#77738A] font-jakarta mt-1">{plan.assignedPlan.tagline}</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[20px] font-bold text-[#17152B] font-space" id="current-plan-price">
                    {formatPlanPrice(plan.assignedPlan)}
                  </div>
                  {plan.assignedPlan.price.kind === 'fixed' && plan.assignedPlan.price.proposed && (
                    <div className="text-[11px] font-mono text-[#77738A]">Proposed pricing</div>
                  )}
                  {sub.billingInterval && (
                    <div className="text-[12px] text-[#77738A] font-jakarta">
                      Billed {sub.billingInterval === 'month' ? 'monthly' : sub.billingInterval === 'year' ? 'yearly' : 'by agreement'}
                    </div>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] font-jakarta">
                <div className="p-3 rounded-xl border border-[#E6E2F0]">
                  <dt className="text-[#77738A]">Active events allowance</dt>
                  <dd className="text-[14px] font-semibold text-[#17152B] mt-0.5">
                    {plan.entitlements.maxActiveEvents ?? 'Unlimited'}
                  </dd>
                </div>
                <div className="p-3 rounded-xl border border-[#E6E2F0]">
                  <dt className="text-[#77738A]">{trialEnd ? 'Trial ends' : 'Current period ends'}</dt>
                  <dd className="text-[14px] font-semibold text-[#17152B] mt-0.5">{trialEnd ?? periodEnd ?? '—'}</dd>
                </div>
                <div className="p-3 rounded-xl border border-[#E6E2F0]">
                  <dt className="text-[#77738A]">Renewal</dt>
                  <dd className="text-[14px] font-semibold text-[#17152B] mt-0.5">
                    {plan.assignedPlan.isPaid ? (sub.cancelAtPeriodEnd ? 'Cancels at period end' : 'Managed by ARAM BTS') : 'Not applicable'}
                  </dd>
                </div>
              </dl>

              {!plan.inGoodStanding && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5 text-[13px] font-jakarta" role="status">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
                  <span>
                    This workspace&apos;s {plan.assignedPlan.name} subscription is not in good standing, so{' '}
                    {effective.name} plan entitlements currently apply. Please contact the ARAM BTS team.
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Plan catalogue */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">AVAILABLE PLANS</span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">Compare Plans</h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            Pricing and limits are proposals and may change before launch.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const currentId = state.kind === 'ready' ? state.plan.assignedPlan.id : null;
            const cta = currentId ? getPlanCta(p.id, currentId) : null;
            const isCurrent = cta?.kind === 'current';
            return (
              <div
                key={p.id}
                id={`plan-card-${p.id}`}
                className={`flex flex-col rounded-xl border p-5 transition-all ${
                  isCurrent ? 'border-[#7C5CFC] bg-[#F6F1FF] shadow-xs' : 'border-[#E6E2F0] hover:border-[#7C5CFC]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[#17152B] font-space">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-mono font-medium text-[#7C5CFC] bg-white border border-[#E6E2F0] px-2 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[20px] font-bold text-[#17152B] font-space">{formatPlanPrice(p)}</div>
                {p.price.kind === 'fixed' && p.price.proposed && (
                  <div className="text-[11px] font-mono text-[#77738A]">Proposed</div>
                )}
                <ul className="mt-4 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-[#17152B] font-jakarta">
                      <span className="material-symbols-outlined text-[16px] text-[#7C5CFC] shrink-0">check</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  id={`plan-cta-${p.id}`}
                  disabled
                  aria-disabled="true"
                  className={`mt-5 w-full px-3 py-2 rounded-lg text-[13px] font-semibold font-jakarta border cursor-not-allowed ${
                    isCurrent
                      ? 'bg-white border-[#7C5CFC] text-[#7C5CFC]'
                      : 'bg-[#FAF9FF] border-[#E6E2F0] text-[#77738A]'
                  }`}
                >
                  {cta ? (cta.kind === 'current' ? cta.label : `${cta.label} · ${cta.note}`) : '—'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-2.5 text-[12px] text-[#77738A] font-jakarta bg-[#FAF9FF] p-3.5 rounded-xl border border-[#E6E2F0]">
          <span className="material-symbols-outlined text-[18px] text-[#7C5CFC] mt-0.5 shrink-0">info</span>
          <div>
            <span className="font-semibold text-[#17152B] block">Online upgrades are coming soon</span>
            <span>
              Self-service checkout is not yet available. Plan changes are currently applied by the ARAM BTS team.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
