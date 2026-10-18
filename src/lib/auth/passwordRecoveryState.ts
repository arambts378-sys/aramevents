export class PasswordRecoveryState {
  private verified = false;
  private listeners = new Set<(verified: boolean) => void>();

  handleAuthEvent(event: string, hasSession: boolean) {
    if (event === 'PASSWORD_RECOVERY') {
      this.update(hasSession);
    } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      this.update(false);
    }
  }

  subscribe(listener: (verified: boolean) => void) {
    this.listeners.add(listener);
    listener(this.verified);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear() {
    this.update(false);
  }

  private update(verified: boolean) {
    if (this.verified === verified) return;
    this.verified = verified;
    this.listeners.forEach((listener) => listener(verified));
  }
}

export const passwordRecoveryState = new PasswordRecoveryState();
