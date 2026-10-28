'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** True only in the browser after hydration, so locale-formatted times never mismatch the server render. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
