// Plain-English checks and error messages for the sign-in forms.

export const MIN_PASSWORD = 8;

export function emailProblem(email: string): string | null {
  const e = email.trim();
  if (!e) return 'Enter your email address.';
  // A light check; the confirmation email is the real test.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'That doesn’t look like an email address.';
  return null;
}

export function passwordProblem(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  return null;
}

/** Turns an error from the sign-in service into a sentence that says what to do. */
export function friendlyAuthError(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  const m = message.toLowerCase();
  if (code === 'invalid_credentials' || m.includes('invalid login credentials')) return 'That email and password don’t match an account.';
  if (code === 'email_not_confirmed' || m.includes('email not confirmed'))
    return 'Confirm your email first: open the link we sent you, then log in.';
  if (code === 'user_already_exists' || m.includes('already registered'))
    return 'An account with this email already exists. Log in instead.';
  if (code === 'weak_password' || m.includes('password should')) return `Choose a stronger password (at least ${MIN_PASSWORD} characters).`;
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error?.status === 429 || m.includes('rate limit'))
    return 'Too many attempts. Wait a minute, then try again.';
  if (code === 'provider_disabled' || m.includes('provider is not enabled'))
    return 'This sign-in option isn’t turned on for this site yet.';
  if (code === 'same_password') return 'Choose a password different from your current one.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Couldn’t reach the sign-in service. Check your connection and try again.';
  return message || 'Something went wrong with sign-in. Try again.';
}
