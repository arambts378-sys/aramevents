'use client';

import React, { useState, useTransition } from 'react';
import { grantPlatformAccessAction } from '@/app/actions/superAdminActions';
import type { PlatformRoleName } from '@/services/superAdminLive.server';

export function GrantAccessForm({ roles }: { roles: Array<{ id: PlatformRoleName; label: string; description: string }> }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformRoleName>('support');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const chosen = roles.find((r) => r.id === role);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await grantPlatformAccessAction(email, role);
          setStatus({ ok: r.ok, text: r.message });
          if (r.ok) setEmail('');
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <label htmlFor="grant-email" className="ds-label">Email address</label>
          <input
            id="grant-email"
            type="email"
            required
            className="ds-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="grant-role" className="ds-label">Role</label>
          <select id="grant-role" className="ds-input" value={role} onChange={(e) => setRole(e.target.value as PlatformRoleName)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="ds-btn ds-btn-primary" disabled={pending}>
          {pending ? 'Granting…' : 'Grant access'}
        </button>
      </div>
      <p className="text-[12px] text-ds-muted">
        {chosen?.description} If there’s no account for this email yet, we create one and email them a link to set a password.
      </p>
      {status && (
        <p role="status" className={`text-[13px] ${status.ok ? 'text-ds-success' : 'text-ds-danger'}`}>{status.text}</p>
      )}
    </form>
  );
}
