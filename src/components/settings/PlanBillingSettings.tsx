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
import { FooterHint, Notice, SettingsCard, Spinner } from './SettingsUI';

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
  return inGoodStanding ? 'bg-ds-success-soft text-ds-success' : 'bg-ds-warning-soft text-ds-warning';
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
    <div className="space-y-5">
      {/* Current plan */}
      <SettingsCard
        title="Current plan"
        description={
          <>
            The plan assigned to{' '}
            {activeWorkspace?.name ? <span className="font-medium text-ds-ink">{activeWorkspace.name}</span> : 'your workspace'}.
          </>
        }
      >
        {(state.kind === 'loading' || !workspaceId) && (
          <div className="flex items-center gap-2.5 text-[13px] text-ds-muted" role="status">
            <Spinner />
            <span>Loading plan details…</span>
          </div>
        )}

        {state.kind === 'error' && workspaceId && <Notice tone="error">{state.message}</Notice>}

        {state.kind === 'ready' && workspaceId && (() => {
          const { plan } = state;
          const sub = plan.subscription;
          const periodEnd = formatDate(sub.currentPeriodEnd);
          const trialEnd = formatDate(sub.trialEndsAt);
          const effective = plans.find((p) => p.id === plan.effectivePlanId)!;
          return (
            <div className="space-y-5" data-testid="current-plan">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[20px] font-semibold tracking-tight text-ds-ink" id="current-plan-name">
                      {plan.assignedPlan.name}
                    </span>
                    <span
                      id="current-plan-status"
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-medium ${statusTone(plan.inGoodStanding)}`}
                    >
                      {sub.isDefault ? 'Active · Default' : getSubscriptionStatusLabel(sub.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-ds-muted">{plan.assignedPlan.tagline}</p>
                </div>
                <div className="sm:text-right">
                  <div className="text-[18px] font-semibold text-ds-ink" id="current-plan-price">
                    {formatPlanPrice(plan.assignedPlan)}
                  </div>
                  {plan.assignedPlan.price.kind === 'fixed' && plan.assignedPlan.price.proposed && (
                    <div className="text-[12px] text-ds-muted">Proposed pricing</div>
                  )}
                  {sub.billingInterval && (
                    <div className="text-[12px] text-ds-muted">
                      Billed {sub.billingInterval === 'month' ? 'monthly' : sub.billingInterval === 'year' ? 'yearly' : 'by agreement'}
                    </div>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 divide-y divide-ds-line rounded-lg border border-ds-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-4 py-3">
                  <dt className="text-[12px] text-ds-muted">Active events</dt>
                  <dd className="mt-0.5 text-[14px] font-medium text-ds-ink">
                    {plan.entitlements.maxActiveEvents ?? 'Unlimited'}
                  </dd>
                </div>
                <div className="px-4 py-3">
                  <dt className="text-[12px] text-ds-muted">{trialEnd ? 'Trial ends' : 'Current period ends'}</dt>
                  <dd className="mt-0.5 text-[14px] font-medium text-ds-ink">{trialEnd ?? periodEnd ?? '—'}</dd>
                </div>
                <div className="px-4 py-3">
                  <dt className="text-[12px] text-ds-muted">Renewal</dt>
                  <dd className="mt-0.5 text-[14px] font-medium text-ds-ink">
                    {plan.assignedPlan.isPaid ? (sub.cancelAtPeriodEnd ? 'Cancels at period end' : 'Managed by Aram') : 'Not applicable'}
                  </dd>
                </div>
              </dl>

              {!plan.inGoodStanding && (
                <Notice tone="warning">
                  This workspace&apos;s {plan.assignedPlan.name} subscription is not in good standing, so{' '}
                  {effective.name} plan limits currently apply. Please contact the Aram team.
                </Notice>
              )}
            </div>
          );
        })()}
      </SettingsCard>

      {/* Plan catalogue */}
      <SettingsCard
        title="Plans"
        description="Compare what each plan includes. Pricing and limits may change before launch."
        footer={<FooterHint>Online upgrades are coming soon. For now, the Aram team applies plan changes for you.</FooterHint>}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((p) => {
            const currentId = state.kind === 'ready' ? state.plan.assignedPlan.id : null;
            const cta = currentId ? getPlanCta(p.id, currentId) : null;
            const isCurrent = cta?.kind === 'current';
            return (
              <div
                key={p.id}
                id={`plan-card-${p.id}`}
                className={`flex flex-col rounded-lg border p-4 ${
                  isCurrent ? 'border-ds-ink/80 ring-1 ring-ds-ink/80' : 'border-ds-line'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-ds-ink">{p.name}</h3>
                  {isCurrent && (
                    <span className="rounded-md bg-ds-ink px-1.5 py-0.5 text-[11px] font-medium text-white">Current</span>
                  )}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-ds-ink">{formatPlanPrice(p)}</div>
                {p.price.kind === 'fixed' && p.price.proposed && (
                  <div className="text-[12px] text-ds-muted">Proposed</div>
                )}
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ds-body">
                      <span className="material-symbols-outlined shrink-0 text-[16px] text-ds-muted" aria-hidden="true">check</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  id={`plan-cta-${p.id}`}
                  disabled
                  aria-disabled="true"
                  className="ds-btn ds-btn-secondary ds-btn-sm mt-4 w-full"
                >
                  {cta ? (cta.kind === 'current' ? cta.label : `${cta.label} · ${cta.note}`) : '—'}
                </button>
              </div>
            );
          })}
        </div>
      </SettingsCard>
    </div>
  );
}
