import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, StatusPill } from '@/components/ui';
import { ActionDialog } from '@/components/super-admin/controls/ActionDialog';
import { RoleSelect } from '@/components/super-admin/controls/RoleSelect';
import { NameForm, PasswordForm, SignOutEverywhere } from '@/components/super-admin/settings/AccountForms';
import { GrantAccessForm } from '@/components/super-admin/settings/GrantAccessForm';
import { fmtAgo, fmtDate, roleLabel } from '@/components/super-admin/fmt';
import { getConfigChecks } from '@/services/platformMonitoring.server';
import { PLATFORM_ROLES, getMyAccount, listPlatformAdmins } from '@/services/superAdminLive.server';
import { revokePlatformAccessAction, setPlatformRoleAction, updatePlatformAccessAction } from '@/app/actions/superAdminActions';

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-6 gap-4 border-t border-ds-line pt-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={`${id}-title`} className="text-[15px] font-semibold text-ds-ink">{title}</h2>
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ds-muted">{description}</p>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const [meResult, adminsResult] = await Promise.all([getMyAccount(), listPlatformAdmins()]);
  const checks = getConfigChecks();
  const missing = checks.filter((c) => c.required && !c.configured).length;
  const roleOptions = PLATFORM_ROLES.map((r) => ({ value: r.id, label: r.label }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your admin account, who else can use this console, and whether the servers are configured."
      />

      <Section id="account" title="Your account" description="How you appear in the audit log, and how you sign in.">
        {meResult.ok ? (
          <>
            <div className="ds-card p-4 sm:p-5">
              <dl className="mb-4 grid gap-3 text-[13px] sm:grid-cols-3">
                <div><dt className="text-ds-muted">Email</dt><dd className="mt-0.5 truncate text-ds-ink">{meResult.data.email}</dd></div>
                <div><dt className="text-ds-muted">Role</dt><dd className="mt-0.5 text-ds-ink">{roleLabel(meResult.data.role)}</dd></div>
                <div><dt className="text-ds-muted">Last sign-in</dt><dd className="mt-0.5 text-ds-ink">{fmtAgo(meResult.data.lastSignInAt)}</dd></div>
              </dl>
              <NameForm initial={meResult.data.name ?? ''} />
            </div>
            <div className="ds-card p-4 sm:p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-ds-ink">Change password</h3>
              <PasswordForm />
            </div>
            <div className="ds-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="text-[14px] font-semibold text-ds-ink">Sessions</h3>
                <p className="mt-0.5 text-[13px] text-ds-muted">Lost a laptop or signed in somewhere shared? End every session, including this one.</p>
              </div>
              <SignOutEverywhere />
            </div>
          </>
        ) : (
          <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load your account" description={meResult.message} /></div>
        )}
      </Section>

      <Section
        id="access"
        title="Admin access"
        description="Give someone access to this console by email. Super admins can change everything; moderators handle events; support can only look."
      >
        {!adminsResult.ok ? (
          <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load the admin team" description={adminsResult.message} /></div>
        ) : (
          <>
            {adminsResult.data.canManage ? (
              <div className="ds-card p-4 sm:p-5">
                <h3 className="mb-3 text-[14px] font-semibold text-ds-ink">Grant access</h3>
                <GrantAccessForm roles={PLATFORM_ROLES} />
              </div>
            ) : (
              <p className="rounded-xl border border-ds-line bg-ds-subtle px-4 py-3 text-[13px] text-ds-muted">Only super admins can grant or change admin access.</p>
            )}

            <div className="ds-card overflow-hidden">
              <ul className="divide-y divide-ds-line">
                {adminsResult.data.admins.map((a) => {
                  const isMe = a.userId === adminsResult.data.meId;
                  const locked = isMe || !adminsResult.data.canManage;
                  return (
                    <li key={a.userId} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ds-ink">
                          <Link href={`/super-admin/organizers/${a.userId}`} className="truncate hover:text-ds-accent">{a.name || a.email || 'Unknown account'}</Link>
                          {isMe && <span className="text-[12px] font-normal text-ds-muted">You</span>}
                          {!a.isActive && <StatusPill tone="warning">Paused</StatusPill>}
                          {a.pendingInvite && <StatusPill tone="info">Hasn’t signed in yet</StatusPill>}
                        </p>
                        <p className="text-[12px] text-ds-muted">
                          {a.name && `${a.email}, `}added {fmtDate(a.grantedAt)}, last sign-in {fmtAgo(a.lastSignInAt).toLowerCase()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2">
                        {locked ? (
                          <StatusPill tone="brand" dot={false}>{roleLabel(a.role)}</StatusPill>
                        ) : (
                          <RoleSelect label={`Role for ${a.email}`} value={a.role} options={roleOptions} action={setPlatformRoleAction.bind(null, a.userId)} />
                        )}
                        {!locked && (
                          a.isActive ? (
                            <ActionDialog
                              label="Pause"
                              variant="ghost"
                              title={`Pause access for ${a.email}?`}
                              description="They can’t open the console until you resume it. Their role is remembered."
                              confirmLabel="Pause access"
                              action={updatePlatformAccessAction.bind(null, a.userId, { isActive: false })}
                            />
                          ) : (
                            <ActionDialog
                              label="Resume"
                              variant="ghost"
                              title={`Resume access for ${a.email}?`}
                              description={`They can use the console again as ${roleLabel(a.role).toLowerCase()}.`}
                              confirmLabel="Resume access"
                              action={updatePlatformAccessAction.bind(null, a.userId, { isActive: true })}
                            />
                          )
                        )}
                        {!locked && (
                          <ActionDialog
                            label="Remove"
                            variant="ghost"
                            tone="danger"
                            title={`Remove admin access for ${a.email}?`}
                            description="Their organizer account and workspaces stay as they are; only console access goes."
                            confirmLabel="Remove access"
                            action={revokePlatformAccessAction.bind(null, a.userId)}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </Section>

      <Section id="config" title="Server configuration" description="Secrets the app servers need. Only whether each is set is shown, never the value.">
        <div className="ds-card p-4 sm:p-5">
          <p className={`mb-2 text-[13px] ${missing ? 'text-ds-danger' : 'text-ds-success'}`}>
            {missing ? `${missing} required ${missing === 1 ? 'secret is' : 'secrets are'} missing from the deployment environment.` : 'Every required secret is set.'}
          </p>
          <ul className="divide-y divide-ds-line">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] text-ds-ink">{c.label}</p>
                  <p className="text-[12px] text-ds-muted">{c.detail}</p>
                </div>
                {c.configured ? (
                  <StatusPill tone="success">Set</StatusPill>
                ) : (
                  <StatusPill tone={c.required ? 'danger' : 'warning'}>{c.required ? 'Missing' : 'Not set'}</StatusPill>
                )}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-ds-muted">
          Monitoring controls moved to <Link href="/super-admin/monitoring?tab=settings" className="font-medium text-ds-accent hover:underline">Monitoring, Settings tab</Link>.
        </p>
      </Section>
    </div>
  );
}
