import { createBrowserClient } from '@supabase/ssr'
import { passwordRecoveryState } from '@/lib/auth/passwordRecoveryState'

let recoveryListenerRegistered = false

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-url.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'
  )

  if (typeof window !== 'undefined' && !recoveryListenerRegistered) {
    recoveryListenerRegistered = true
    client.auth.onAuthStateChange((event, session) => {
      passwordRecoveryState.handleAuthEvent(event, !!session)
    })
  }

  return client
}
