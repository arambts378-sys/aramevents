'use client';

import { useEffect } from 'react';

// A recovery link that lands on another page (Supabase falls back to the Site URL when the
// redirect isn't allowed) is sent on to /reset-password with its token intact. The PKCE browser
// client rejects these implicit-flow links rather than consuming them, so the hash is still there.
export function RecoveryLinkForward() {
  useEffect(() => {
    if (/[#&]type=recovery(&|$)/.test(window.location.hash) && window.location.pathname !== '/reset-password') {
      window.location.replace(`/reset-password${window.location.hash}`);
    }
  }, []);
  return null;
}
