import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyPanel, Panel, StatusPill } from '@/components/ui';
import { ActionDialog } from '@/components/super-admin/controls/ActionDialog';
import { RoleSelect } from '@/components/super-admin/controls/RoleSelect';
import { STATUS_PILL, fmtAgo, fmtDate, roleLabel } from '@/components/super-admin/fmt';
import { getOrganizer } from '@/services/superAdminLive.server';
import {
  confirmOrganizerEmailAction,
  removeMemberAction,
  revokeInvitationAction,
  sendOrganizerPasswordResetAction,
  setEventStatusAction,
  setMemberRoleAction,
  setOrganizerBlockedAction,
  setWorkspaceSuspendedAction,
} from '@/app/actions/superAdminActions';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_TONE: Record<string, 'success' | 'neutral' | 'brand'> = { published: 'success', draft: 'brand', archived: 'neutral' };
const EVENT_LABEL: Record<string, string> = { published: 'Live', draft: 'Draft', archived: 'Archived' };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
      <dt className="text-ds-muted">{label}</dt>
      <dd className="text-right text-ds-ink">{children}</dd>
    </div>
  );
}

export default async function OrganizerDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!UUID.test(userId)) notFound();
  const result = await getOrganizer(userId);
  if (!result) notFound();

  if (!result.ok) {
    return <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load this account" description={result.message} /></div>;
  }

  const { account, workspaces, roles, history } = result.data;
  const blocked = account.status === 'blocked';
  const display = account.name || account.email || 'Unnamed account';
  const assignableRoles = roles.filter((r) => r.name !== 'workspace_owner').map((r) => ({ value: r.id, label: roleLabel(r.name) }));

  return (
    <div className="space-y-6">
      <Link href="/super-admin/organizers" className="inline-flex items-center gap-1 text-[13px] text-ds-muted hover:text-ds-ink">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
        Organizers
      </Link>

      {/* Account header with the account-level controls */}
      <header className="flex flex-col gap-4 border-b border-ds-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold ${blocked ? 'bg-ds-danger-soft text-ds-danger' : 'bg-ds-accent-soft text-ds-accent-strong'}`}>
            {display.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold leading-tight tracking-tight text-ds-ink">{display}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ds-muted">
              {account.name && <span className="truncate">{account.email}</span>}
              <StatusPill tone={STATUS_PILL[account.status].tone}>{STATUS_PILL[account.status].label}</StatusPill>
              {account.platformRole && <StatusPill tone="brand" dot={false}>Platform {roleLabel(account.platformRole).toLowerCase()}</StatusPill>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {account.status === 'unverified' && (
            <ActionDialog
              label="Mark email verified"
              icon="mark_email_read"
              title={`Verify ${account.email}?`}
              description="Use this when you’ve confirmed the address another way. They can sign in straight away without the code."
              action={confirmOrganizerEmailAction.bind(null, account.id)}
            />
          )}
          <ActionDialog
            label="Send password reset"
            icon="lock_reset"
            title="Send a password reset email?"
            description={<>We’ll email <strong className="text-ds-ink">{account.email}</strong> a link to choose a new password. Their current password keeps working until they do.</>}
            confirmLabel="Send email"
            disabled={!account.email}
            action={sendOrganizerPasswordResetAction.bind(null, account.id)}
          />
          {blocked ? (
            <ActionDialog
              label="Unblock sign-in"
              icon="lock_open"
              variant="primary"
              title="Let this organizer sign in again?"
              description="Their workspaces, events and team are untouched while blocked, so everything is where they left it."
              reason="optional"
              action={setOrganizerBlockedAction.bind(null, account.id, false)}
            />
          ) : (
            <ActionDialog
              label="Block sign-in"
              icon="block"
              variant="danger"
              tone="danger"
              title={`Block ${display}?`}
              description="They’re signed out within the hour and can’t sign back in. Their public event pages stay up; unpublish events separately if needed."
              reason="required"
              disabled={account.isPlatformAdmin}
              action={setOrganizerBlockedAction.bind(null, account.id, true)}
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {workspaces.length === 0 && (
            <div className="ds-card">
              <EmptyPanel icon="domain_disabled" title="No workspace yet" description="This account signed up but hasn’t created or joined a workspace." />
            </div>
          )}

          {workspaces.map((w) => (
            <section key={w.id} className="ds-card overflow-hidden" aria-labelledby={`ws-${w.id}`}>
              <div className="flex flex-col gap-3 border-b border-ds-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <h2 id={`ws-${w.id}`} className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-ds-ink">
                    {w.name}
                    {w.isSuspended && <StatusPill tone="danger">Suspended</StatusPill>}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ds-muted">
                    {w.isOwner ? 'Owned by this account' : `${roleLabel(w.myRole)} in this workspace`}, created {fmtDate(w.createdAt)}
                  </p>
                  {w.isSuspended && w.suspendedReason && <p className="mt-1 text-[13px] text-ds-danger">Reason: {w.suspendedReason}</p>}
                </div>
                {w.isSuspended ? (
                  <ActionDialog
                    label="Reactivate workspace"
                    icon="play_circle"
                    title={`Reactivate ${w.name}?`}
                    description="The team can manage events again."
                    reason="optional"
                    action={setWorkspaceSuspendedAction.bind(null, w.id, false)}
                  />
                ) : (
                  <ActionDialog
                    label="Suspend workspace"
                    icon="pause_circle"
                    tone="danger"
                    title={`Suspend ${w.name}?`}
                    description="Everyone in the workspace sees a suspension notice with your reason. Use Block sign-in to stop a person signing in at all."
                    reason="required"
                    action={setWorkspaceSuspendedAction.bind(null, w.id, true)}
                  />
                )}
              </div>

              {/* Team */}
              <div className="px-4 pt-4 sm:px-5">
                <h3 className="text-[13px] font-semibold text-ds-ink">Team ({w.members.length})</h3>
              </div>
              <div className="ds-table-wrap">
                <table className="ds-table min-w-[620px]">
                  <thead>
                    <tr>
                      <th scope="col">Person</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
                      <th scope="col" className="text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.members.map((m) => (
                      <tr key={m.userId}>
                        <td>
                          <Link href={`/super-admin/organizers/${m.userId}`} className="font-medium text-ds-ink hover:text-ds-accent">
                            {m.name || m.email || 'Unknown'}
                          </Link>
                          {m.name && <span className="block text-[12px] text-ds-muted">{m.email}</span>}
                          {m.blocked && <span className="block text-[12px] text-ds-danger">Sign-in blocked</span>}
                        </td>
                        <td>
                          {m.isOwner ? (
                            <span className="text-ds-ink">Owner</span>
                          ) : (
                            <RoleSelect
                              label={`Role for ${m.email ?? 'member'}`}
                              value={m.roleId ?? ''}
                              options={assignableRoles}
                              action={setMemberRoleAction.bind(null, w.id, m.userId)}
                            />
                          )}
                        </td>
                        <td className="whitespace-nowrap text-ds-muted">{fmtDate(m.joinedAt)}</td>
                        <td className="text-right">
                          {!m.isOwner && (
                            <ActionDialog
                              label="Remove"
                              variant="ghost"
                              tone="danger"
                              title={`Remove ${m.email ?? 'this person'} from ${w.name}?`}
                              description="They lose access to this workspace’s events straight away. Their own account stays active."
                              confirmLabel="Remove from workspace"
                              action={removeMemberAction.bind(null, w.id, m.userId)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {w.invitations.filter((i) => i.status === 'pending').length > 0 && (
                <div className="border-t border-ds-line px-4 py-3 sm:px-5">
                  <h3 className="text-[13px] font-semibold text-ds-ink">Pending invitations</h3>
                  <ul className="mt-2 divide-y divide-ds-line">
                    {w.invitations.filter((i) => i.status === 'pending').map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
                        <span className="text-ds-ink">{i.email} <span className="text-ds-muted">as {roleLabel(i.role).toLowerCase()}, sent {fmtAgo(i.createdAt)}</span></span>
                        <ActionDialog
                          label="Revoke"
                          variant="ghost"
                          title={`Revoke the invitation for ${i.email}?`}
                          description="The link in their email stops working."
                          confirmLabel="Revoke invitation"
                          action={revokeInvitationAction.bind(null, i.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Events */}
              <div className="border-t border-ds-line px-4 pt-4 sm:px-5">
                <h3 className="text-[13px] font-semibold text-ds-ink">Events ({w.events.length})</h3>
              </div>
              {w.events.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-ds-muted sm:px-5">No events in this workspace yet.</p>
              ) : (
                <div className="ds-table-wrap">
                  <table className="ds-table min-w-[680px]">
                    <thead>
                      <tr>
                        <th scope="col">Event</th>
                        <th scope="col">Date</th>
                        <th scope="col" className="text-right">Registrations</th>
                        <th scope="col" className="text-right">Checked in</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.events.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <span className="font-medium text-ds-ink">{e.name}</span>
                            {e.status === 'published' && (
                              <a href={`/events/${e.slug}`} target="_blank" rel="noreferrer" className="block text-[12px] text-ds-accent hover:underline">
                                View public page
                              </a>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-ds-muted">{fmtDate(e.startDate)}</td>
                          <td className="text-right tabular-nums">{e.registrations.toLocaleString('en')}</td>
                          <td className="text-right tabular-nums">{e.checkIns.toLocaleString('en')}</td>
                          <td><StatusPill tone={EVENT_TONE[e.status] ?? 'neutral'}>{EVENT_LABEL[e.status] ?? e.status}</StatusPill></td>
                          <td className="text-right">
                            {e.status === 'published' ? (
                              <ActionDialog
                                label="Unpublish"
                                variant="ghost"
                                tone="danger"
                                title={`Take ${e.name} offline?`}
                                description="The public page and registration form stop working. Existing registrations and tickets are kept."
                                reason="required"
                                action={setEventStatusAction.bind(null, e.id, 'draft')}
                              />
                            ) : (
                              <ActionDialog
                                label="Publish"
                                variant="ghost"
                                title={`Publish ${e.name}?`}
                                description="The public page and registration form go live."
                                reason="optional"
                                action={setEventStatusAction.bind(null, e.id, 'published')}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="space-y-6">
          <Panel title="Account">
            <dl className="-my-2.5 divide-y divide-ds-line">
              <Fact label="Joined">{fmtDate(account.createdAt)}</Fact>
              <Fact label="Last sign-in">{fmtAgo(account.lastSignInAt)}</Fact>
              <Fact label="Email verified">{account.emailConfirmedAt ? fmtDate(account.emailConfirmedAt) : 'Not yet'}</Fact>
              <Fact label="Workspaces">{workspaces.length}</Fact>
              <Fact label="Events">{workspaces.reduce((s, w) => s + w.events.length, 0)}</Fact>
              {blocked && <Fact label="Blocked until">{account.bannedUntil && new Date(account.bannedUntil).getFullYear() > 2100 ? 'Until an admin unblocks' : fmtDate(account.bannedUntil)}</Fact>}
            </dl>
          </Panel>

          <Panel title="Admin history" description="Changes made to this account, its workspaces and events.">
            {history.length === 0 ? (
              <p className="text-[13px] text-ds-muted">No admin changes yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-[13px]">
                    <p className="text-ds-ink">{h.action.replace(/[._]/g, ' ')}</p>
                    {h.reason && <p className="text-ds-body">“{h.reason}”</p>}
                    <p className="text-[12px] text-ds-muted">{h.actorEmail ?? 'An admin'}, {fmtAgo(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
