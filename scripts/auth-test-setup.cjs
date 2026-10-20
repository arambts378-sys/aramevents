// Test bootstrap for the organizer auth route tests (CommonJS, loaded via `node --require`).
//  - resolves the "@/..." tsconfig path alias (ts-node does not do this on its own)
//  - replaces modules that talk to the network (Supabase clients, SMTP) with in-memory fakes
//    controlled through `globalThis.__authTest` (a FakeSupabase instance).
// No extra dependencies.
const Module = require('node:module');
const path = require('node:path');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.OTP_PEPPER_SECRET = process.env.OTP_PEPPER_SECRET || 'test-otp-pepper-secret-32-chars-long-x!';

const srcRoot = path.resolve(__dirname, '..', 'src');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    request = path.join(srcRoot, request.slice(2));
  }
  return originalResolve.call(this, request, ...rest);
};

const fake = () => globalThis.__authTest;

const mocks = {
  'server-only': {},
  '@/services/platformActivity.server': {
    getActivityCorrelationId: () => '20000000-0000-4000-8000-000000000002',
    recordPlatformActivity: async () => true,
  },
  '@/lib/supabase/admin': {
    createAdminClient: () => fake().client(),
  },
  '@/lib/supabase/server': {
    createClient: async () => ({ auth: { verifyOtp: async () => ({ data: {}, error: null }) } }),
  },
  '@/services/organizerMailer': {
    sendOrganizerVerificationEmail: async (to, otp) => {
      const f = fake();
      if (f.failMailTimes > 0) {
        f.failMailTimes--;
        throw new Error('SMTP exploded: smtp.internal.example:587 auth failed');
      }
      f.mailbox.push({ type: 'otp', to, otp });
      return { success: true };
    },
    sendExistingAccountNoticeEmail: async (to) => {
      const f = fake();
      if (f.failMailTimes > 0) {
        f.failMailTimes--;
        throw new Error('SMTP exploded: smtp.internal.example:587 auth failed');
      }
      f.mailbox.push({ type: 'notice', to });
      return { success: true };
    },
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (typeof request === 'string' && Object.prototype.hasOwnProperty.call(mocks, request)) {
    return mocks[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};
