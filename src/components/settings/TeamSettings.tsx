'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Field, FooterHint, Notice, SaveButton, SelectInput, SettingsCard, Spinner, StatusNotices } from './SettingsUI';

type Role = 'workspace_owner' | 'admin' | 'editor' | 'member' | 'viewer';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
  isOwner: boolean;
  isYou: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

interface TeamData {
  you: { role: Role; canManage: boolean };
  members: Member[];
  invitations: Invitation[];
  limit: { maxMembers: number | null; used: number };
}

const ROLE_INFO: Record<Role, { label: string; can: string }> = {
  workspace_owner: { label: 'Owner', can: 'Everything, including the plan and the team' },
  admin: { label: 'Admin', can: 'Manage events and the team' },
  editor: { label: 'Editor', can: 'Create, edit and publish events, and manage people' },
  member: { label: 'Member', can: 'Create and edit events, and view people' },
  viewer: { label: 'Viewer', can: 'View events and people without changing anything' },
};

const RANK: Record<Role, number> = { workspace_owner: 4, admin: 3, editor: 2, member: 1, viewer: 0 };
const ASSIGNABLE: Role[] = ['admin', 'editor', 'member', 'viewer'];

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

export function TeamSettings() {
  const { activeWorkspace } = useAppContext();
  const workspaceId = activeWorkspace?.id;

  const [data, setData] = useState<TeamData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<{ success?: string; error?: string }>({});
  const [shareLink, setShareLink] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    call(`/api/workspace/team?workspaceId=${workspaceId}`)
      .then((team) => {
        if (cancelled) return;
        setData(team);
        setLoadError('');
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, reloadKey]);

  const load = () => setReloadKey((k) => k + 1);

  const grantable = useMemo(() => (data ? ASSIGNABLE.filter((r) => RANK[r] < RANK[data.you.role]) : []), [data]);
  // An admin cannot grant admin, so fall back to the highest role they can give.
  const inviteRole: Role = grantable.includes(role) ? role : grantable[0] || 'viewer';
  const atLimit = !!data && data.limit.maxMembers !== null && data.limit.used >= data.limit.maxMembers;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setInviting(true);
    setNotice({});
    setShareLink('');
    try {
      const res = await call('/api/workspace/team', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, email, role: inviteRole }),
      });
      if (res.emailSent) {
        setNotice({ success: `Invitation sent to ${res.invitation.email}.` });
      } else {
        setNotice({ error: `The invitation was created, but the email could not be sent. Share this link with ${res.invitation.email} instead.` });
        setShareLink(res.link);
      }
      setEmail('');
      load();
    } catch (err) {
      setNotice({ error: (err as Error).message });
    } finally {
      setInviting(false);
    }
  };

  const act = async (id: string, run: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setNotice({});
    try {
      await run();
      setNotice({ success });
      load();
    } catch (err) {
      setNotice({ error: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (m: Member, next: Role) =>
    act(m.userId, () => call(`/api/workspace/team/members/${m.userId}`, { method: 'PATCH', body: JSON.stringify({ workspaceId, role: next }) }), `${m.name} is now ${ROLE_INFO[next].label.toLowerCase()}.`);

  const remove = (m: Member) => {
    if (!window.confirm(`Remove ${m.name} from this workspace? They will lose access to every event straight away.`)) return;
    act(m.userId, () => call(`/api/workspace/team/members/${m.userId}?workspaceId=${workspaceId}`, { method: 'DELETE' }), `${m.name} was removed.`);
  };

  const revoke = (i: Invitation) =>
    act(i.id, () => call(`/api/workspace/team/invitations/${i.id}?workspaceId=${workspaceId}`, { method: 'DELETE' }), `Invitation for ${i.email} revoked.`);

  if (!workspaceId || (!data && !loadError)) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-ds-muted">
        <Spinner /> Loading your team…
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <Notice tone="error" title="The team could not be loaded">
        {loadError}{' '}
        <button type="button" onClick={load} className="font-medium underline">
          Try again
        </button>
      </Notice>
    );
  }

  const canManageMember = (m: Member) => data.you.canManage && !m.isOwner && !m.isYou && RANK[m.role] < RANK[data.you.role];

  return (
    <div className="space-y-6">
      <StatusNotices success={notice.success} error={notice.error} />
      {shareLink && (
        <div className="flex flex-col gap-2 rounded-lg border border-ds-line bg-white p-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate text-[12px] text-ds-body">{shareLink}</code>
          <button type="button" className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => navigator.clipboard?.writeText(shareLink)}>
            Copy link
          </button>
        </div>
      )}

      {data.you.canManage && (
        <SettingsCard
          title="Invite a team member"
          description="They get an email with a link. They sign in or create an account with that address to join."
          footer={
            <>
              <FooterHint>
                {data.limit.maxMembers === null
                  ? `${data.limit.used} members and pending invitations.`
                  : `${data.limit.used} of ${data.limit.maxMembers} seats used, including pending invitations.`}
              </FooterHint>
              <SaveButton
                type="submit"
                form="invite-form"
                saving={inviting}
                disabled={atLimit || !email.trim()}
                label="Send invitation"
                savingLabel="Sending…"
              />
            </>
          }
        >
          <form id="invite-form" onSubmit={invite} className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Email address" htmlFor="invite-email">
              <input
                id="invite-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="ds-input"
                disabled={atLimit}
              />
            </Field>
            <Field label="Role" htmlFor="invite-role" description={ROLE_INFO[inviteRole].can}>
              <SelectInput id="invite-role" value={inviteRole} onChange={(e) => setRole(e.target.value as Role)} disabled={atLimit}>
                {grantable.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_INFO[r].label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </form>
          {atLimit && (
            <div className="mt-4">
              <Notice tone="warning">Your plan’s team seats are all in use. Remove a member or revoke an invitation to invite someone new.</Notice>
            </div>
          )}
        </SettingsCard>
      )}

      <SettingsCard title="Members" description={`${data.members.length} ${data.members.length === 1 ? 'person has' : 'people have'} access to this workspace.`}>
        <ul className="-my-2 divide-y divide-ds-line">
          {data.members.map((m) => (
            <li key={m.userId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ds-accent-soft text-[12px] font-semibold text-ds-accent-strong">
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ds-ink">
                    {m.name}
                    {m.isYou && <span className="ml-1.5 text-[12px] font-normal text-ds-muted">(you)</span>}
                  </p>
                  <p className="truncate text-[13px] text-ds-muted">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {canManageMember(m) ? (
                  <>
                    <div className="w-36">
                      <SelectInput
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        disabled={busyId === m.userId}
                        onChange={(e) => changeRole(m, e.target.value as Role)}
                        className="!min-h-8 !py-1 text-[13px]"
                      >
                        {grantable.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_INFO[r].label}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={busyId === m.userId}
                      className="ds-btn ds-btn-ghost ds-btn-sm text-ds-danger hover:text-ds-danger"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="rounded-md bg-ds-subtle px-2 py-1 text-[12px] font-medium text-ds-body">{ROLE_INFO[m.role]?.label || m.role}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </SettingsCard>

      {data.you.canManage && (
        <SettingsCard title="Pending invitations" description="Invitations expire after seven days. Revoke one to free its seat.">
          {data.invitations.length === 0 ? (
            <p className="text-[13px] text-ds-muted">No invitations are waiting. People you invite appear here until they accept.</p>
          ) : (
            <ul className="-my-2 divide-y divide-ds-line">
              {data.invitations.map((i) => (
                <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ds-ink">{i.email}</p>
                    <p className="text-[13px] text-ds-muted">
                      {ROLE_INFO[i.role]?.label || i.role}, expires in {daysLeft(i.expiresAt)} {daysLeft(i.expiresAt) === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  <button type="button" onClick={() => revoke(i)} disabled={busyId === i.id} className="ds-btn ds-btn-secondary ds-btn-sm self-start sm:self-auto">
                    {busyId === i.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>
      )}

      {!data.you.canManage && (
        <Notice tone="info">Only owners and admins can invite people or change roles. Ask an admin if someone needs access.</Notice>
      )}
    </div>
  );
}
