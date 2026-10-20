/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory fake of the parts of Supabase used by the organizer auth routes.
 * It models the behaviours the routes rely on:
 *  - auth.users with a UNIQUE email (admin.createUser -> `email_exists`)
 *  - the handle_new_user trigger (profile + workspace + owner membership created atomically)
 *  - UNIQUE(workspace_id, user_id) and UNIQUE(slug)
 *
 * IMPORTANT: this is a model, not a database. It proves the application logic is correct
 * under these assumptions; it does NOT verify real Postgres/GoTrue behaviour.
 */
import crypto from 'node:crypto';

type Row = Record<string, any>;

export interface Mail {
  type: 'otp' | 'notice';
  to: string;
  otp?: string;
}

export class FakeSupabase {
  tables: Record<string, Row[]> = {
    profiles: [],
    workspaces: [],
    workspace_members: [],
    roles: [{ id: 'role-owner', name: 'workspace_owner' }],
    organizer_verification_challenges: [],
  };

  users: Array<{
    id: string;
    email: string;
    password: string;
    email_confirmed_at: string | null;
    user_metadata: Record<string, any>;
  }> = [];

  uniques: Record<string, string[][]> = {
    workspaces: [['slug']],
    workspace_members: [['workspace_id', 'user_id']],
    profiles: [['id']],
  };

  mailbox: Mail[] = [];

  // Fault injection / configuration
  triggerEnabled = true;
  failCreateUser: { code: string; status?: number; message: string } | null = null;
  weakPasswords = new Set<string>();
  failMailTimes = 0;
  failTable: { table: string; op: string; times: number } | null = null;

  // Observability
  createUserCalls = 0;
  updateUserCalls: Array<{ id: string; attrs: Row }> = [];

  // ---- auth admin ---------------------------------------------------------
  private authAdmin = {
    createUser: async (attrs: any) => {
      this.createUserCalls++;
      await Promise.resolve(); // yield, as a real network call would
      if (this.failCreateUser) {
        return { data: { user: null }, error: { ...this.failCreateUser } };
      }
      if (this.weakPasswords.has(attrs.password)) {
        return { data: { user: null }, error: { code: 'weak_password', status: 422, message: 'weak' } };
      }
      if (this.users.some((u) => u.email === attrs.email)) {
        return {
          data: { user: null },
          error: {
            code: 'email_exists',
            status: 422,
            message: 'A user with this email address has already been registered',
          },
        };
      }
      const user = {
        id: crypto.randomUUID(),
        email: attrs.email as string,
        password: attrs.password as string,
        email_confirmed_at: attrs.email_confirm ? new Date().toISOString() : null,
        user_metadata: attrs.user_metadata || {},
      };
      this.users.push(user);

      if (this.triggerEnabled) {
        // handle_new_user(): profile + workspace + membership
        const wsId = crypto.randomUUID();
        this.tables.profiles.push({
          id: user.id,
          full_name: user.user_metadata.full_name || 'New Organizer',
          avatar_url: null,
        });
        this.tables.workspaces.push({
          id: wsId,
          name: `${user.user_metadata.full_name || 'Personal'} Workspace`,
          slug: `ws-${crypto.randomBytes(4).toString('hex')}`,
          owner_id: user.id,
          created_at: new Date().toISOString(),
        });
        this.tables.workspace_members.push({
          id: crypto.randomUUID(),
          workspace_id: wsId,
          user_id: user.id,
          role_id: 'role-owner',
        });
      }
      return { data: { user: { id: user.id, email: user.email } }, error: null };
    },

    listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
      const start = (page - 1) * perPage;
      const slice = this.users.slice(start, start + perPage).map((u) => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
      }));
      return { data: { users: slice }, error: null };
    },

    updateUserById: async (id: string, attrs: any) => {
      this.updateUserCalls.push({ id, attrs });
      const u = this.users.find((x) => x.id === id);
      if (!u) return { data: null, error: { message: 'not found' } };
      if (attrs.email_confirm) u.email_confirmed_at = new Date().toISOString();
      if (attrs.password) u.password = attrs.password;
      if (attrs.user_metadata) u.user_metadata = { ...u.user_metadata, ...attrs.user_metadata };
      return { data: { user: u }, error: null };
    },

    generateLink: async () => ({
      data: { properties: { hashed_token: 'hashed', verification_type: 'magiclink' } },
      error: null,
    }),
  };

  client() {
    return {
      auth: { admin: this.authAdmin },
      rpc: async (name: string, args: Row) => {
        if (name === 'create_organizer_verification_challenge') {
          const email = String(args.p_email).trim().toLowerCase();
          const purpose = String(args.p_purpose);
          const challenges = this.tables.organizer_verification_challenges
            .filter((row) => row.email === email && row.purpose === purpose)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
          const latest = challenges[0];
          if (latest && Date.now() - new Date(latest.last_sent_at).getTime() < 45_000) {
            return { data: [{ challenge_id: latest.id, created: false }], error: null };
          }

          const now = new Date().toISOString();
          for (const challenge of challenges) {
            if (!challenge.verified_at && new Date(challenge.expires_at).getTime() > Date.now()) {
              challenge.expires_at = new Date(Date.now() - 1000).toISOString();
            }
          }
          const id = crypto.randomUUID();
          this.tables.organizer_verification_challenges.push({
            id,
            email,
            otp_hash: args.p_otp_hash,
            purpose,
            expires_at: args.p_expires_at,
            attempt_count: 0,
            max_attempts: args.p_max_attempts,
            verified_at: null,
            created_at: now,
            last_sent_at: now,
            request_ip_hash: args.p_request_ip_hash,
            pending_payload: args.p_pending_payload || null,
          });
          return { data: [{ challenge_id: id, created: true }], error: null };
        }

        if (name === 'verify_organizer_verification_challenge') {
          const email = String(args.p_email).trim().toLowerCase();
          const purpose = String(args.p_purpose);
          const otpHashed = String(args.p_otp_hash);
          const challenges = this.tables.organizer_verification_challenges
            .filter((row) => row.email === email && row.purpose === purpose)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
          const challenge = challenges[0];
          if (!challenge) {
            return { data: [{ status: 'NOT_FOUND', challenge_id: null, attempts_remaining: 0, pending_payload: null }], error: null };
          }
          if (challenge.verified_at) {
            return { data: [{ status: 'ALREADY_USED', challenge_id: challenge.id, attempts_remaining: 0, pending_payload: null }], error: null };
          }
          if (new Date(challenge.expires_at).getTime() <= Date.now()) {
            return { data: [{ status: 'EXPIRED', challenge_id: challenge.id, attempts_remaining: 0, pending_payload: null }], error: null };
          }
          if (challenge.attempt_count >= challenge.max_attempts) {
            return { data: [{ status: 'MAX_ATTEMPTS_EXCEEDED', challenge_id: challenge.id, attempts_remaining: 0, pending_payload: null }], error: null };
          }

          challenge.attempt_count++;
          if (challenge.otp_hash === otpHashed) {
            challenge.verified_at = new Date().toISOString();
            return {
              data: [{
                status: 'SUCCESS',
                challenge_id: challenge.id,
                attempts_remaining: challenge.max_attempts - challenge.attempt_count,
                pending_payload: challenge.pending_payload || null,
              }],
              error: null,
            };
          } else {
            const status = challenge.attempt_count >= challenge.max_attempts ? 'MAX_ATTEMPTS_EXCEEDED' : 'INVALID_OTP';
            return {
              data: [{
                status,
                challenge_id: challenge.id,
                attempts_remaining: Math.max(0, challenge.max_attempts - challenge.attempt_count),
                pending_payload: null,
              }],
              error: null,
            };
          }
        }

        return { data: null, error: { code: '42883', message: 'function does not exist' } };
      },
      from: (table: string) => new FakeQuery(this, table),
    };
  }

  // ---- helpers for assertions --------------------------------------------
  userByEmail(email: string) {
    return this.users.find((u) => u.email === email);
  }
  countFor(table: string, predicate: (r: Row) => boolean = () => true) {
    return this.tables[table].filter(predicate).length;
  }
  provisioningCounts(userId: string) {
    return {
      profiles: this.countFor('profiles', (r) => r.id === userId),
      workspaces: this.countFor('workspaces', (r) => r.owner_id === userId),
      memberships: this.countFor('workspace_members', (r) => r.user_id === userId),
    };
  }
  latestOtp(email: string): string | undefined {
    return [...this.mailbox].reverse().find((m) => m.type === 'otp' && m.to === email)?.otp;
  }
  /** Pretend `seconds` have passed since the latest challenge was sent. */
  ageChallenges(email: string, seconds: number) {
    for (const c of this.tables.organizer_verification_challenges) {
      if (c.email === email) {
        c.last_sent_at = new Date(new Date(c.last_sent_at).getTime() - seconds * 1000).toISOString();
        c.created_at = new Date(new Date(c.created_at).getTime() - seconds * 1000).toISOString();
      }
    }
  }
}

class FakeQuery implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  private payload: Row[] = [];
  private updateValues: Row = {};
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private filters: Array<(r: Row) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';

  constructor(
    private db: FakeSupabase,
    private table: string
  ) {}

  select() {
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.upsertOpts = opts;
    return this;
  }
  update(values: Row) {
    this.op = 'update';
    this.updateValues = values;
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  is(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push((r) => r[col] >= val);
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderCol = col;
    this.orderAsc = opts.ascending !== false;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  then<T1 = any, T2 = never>(
    onfulfilled?: ((value: any) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve().then(() => this.exec()).then(onfulfilled, onrejected);
  }

  private violatesUnique(row: Row, ignoreIndex = -1): boolean {
    const rules = this.db.uniques[this.table] || [];
    const rows = this.db.tables[this.table];
    return rules.some((cols) =>
      rows.some((existing, i) => i !== ignoreIndex && cols.every((c) => existing[c] === row[c] && row[c] !== undefined))
    );
  }

  private finish(rows: Row[]) {
    const out = rows.map((r) => ({ ...r }));
    if (this.mode === 'many') return { data: out, error: null };
    if (this.mode === 'single') {
      return out.length === 1
        ? { data: out[0], error: null }
        : { data: null, error: { code: 'PGRST116', message: 'single row expected' } };
    }
    return { data: out[0] ?? null, error: null };
  }

  private exec() {
    const inj = this.db.failTable;
    if (inj && inj.table === this.table && inj.op === this.op && inj.times > 0) {
      inj.times--;
      return { data: null, error: { code: 'XX000', message: 'injected failure with internal details' } };
    }

    const rows = this.db.tables[this.table];
    if (!rows) return { data: null, error: { code: 'PGRST205', message: 'schema cache' } };

    if (this.op === 'insert') {
      const inserted: Row[] = [];
      for (const p of this.payload) {
        const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p };
        if (this.violatesUnique(row)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value' } };
        }
        rows.push(row);
        inserted.push(row);
      }
      return this.finish(inserted);
    }

    if (this.op === 'upsert') {
      const keys = (this.upsertOpts.onConflict || 'id').split(',').map((s) => s.trim());
      const touched: Row[] = [];
      for (const p of this.payload) {
        const idx = rows.findIndex((r) => keys.every((k) => r[k] === p[k]));
        if (idx >= 0) {
          if (!this.upsertOpts.ignoreDuplicates) rows[idx] = { ...rows[idx], ...p };
          touched.push(rows[idx]);
        } else {
          const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p };
          if (this.violatesUnique(row)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value' } };
          }
          rows.push(row);
          touched.push(row);
        }
      }
      return this.finish(touched);
    }

    const matching = rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === 'update') {
      for (const r of matching) Object.assign(r, this.updateValues);
      return this.finish(matching);
    }

    let out = [...matching];
    if (this.orderCol) {
      const col = this.orderCol;
      out.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (this.orderAsc ? 1 : -1));
    }
    if (this.limitN !== null) out = out.slice(0, this.limitN);
    return this.finish(out);
  }
}
