// Sign-in settings, read from .env.local (see docs/ACCOUNTS.md). Only public values
// belong in the browser: the project URL and the anon / publishable key are meant to be
// shipped to visitors. A secret (service role) key would give anyone full access to the
// database, so it is refused here even if it is put in .env.local by mistake.

export interface AuthConfig {
  url: string;
  key: string;
  /** Show "Continue with Google" (the Google provider must be enabled in Supabase). */
  google: boolean;
}

export type AuthSetup = { ok: true; config: AuthConfig } | { ok: false; reason: 'missing' | 'bad-url' | 'secret-key' };

/** True when a key is a secret key: the new sb_secret_ format, or a legacy JWT whose role is service_role. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function readAuthConfig(env: Record<string, unknown>): AuthSetup {
  const text = (name: string) => (typeof env[name] === 'string' ? (env[name] as string).trim() : '');
  const url = text('VITE_SUPABASE_URL');
  const key = text('VITE_SUPABASE_PUBLISHABLE_KEY') || text('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) return { ok: false, reason: 'missing' };
  if (isSecretKey(key)) return { ok: false, reason: 'secret-key' };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'bad-url' };
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return { ok: false, reason: 'bad-url' };
  return { ok: true, config: { url: parsed.origin, key, google: text('VITE_SUPABASE_GOOGLE') === 'true' } };
}

/** What to tell the site owner when sign-in is off (shown only while developing). */
export function setupProblem(setup: AuthSetup): string | null {
  if (setup.ok) return null;
  switch (setup.reason) {
    case 'missing':
      return 'Sign-in is off: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.';
    case 'bad-url':
      return 'Sign-in is off: VITE_SUPABASE_URL must be your project URL, like https://abcd1234.supabase.co.';
    case 'secret-key':
      return 'Sign-in is off: the key in .env.local is a secret (service role) key. Use the anon / publishable key instead, and keep the secret key out of the website.';
  }
}
