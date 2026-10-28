// Sign-in: settings from .env.local, plain-English errors, and the form flows
// against a fake Supabase client (no network, no real accounts).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isSecretKey, readAuthConfig, setupProblem } from './config';
import { emailProblem, friendlyAuthError, passwordProblem } from './messages';
import { connectAuth, useAuth, type AuthClient } from './store';

/** A fake JWT whose payload has the given role (signature irrelevant). */
const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;

describe('settings', () => {
  it('turns sign-in on with a URL and a public key', () => {
    const s = readAuthConfig({ VITE_SUPABASE_URL: 'https://abcd.supabase.co/', VITE_SUPABASE_ANON_KEY: jwt('anon') });
    expect(s).toEqual({ ok: true, config: { url: 'https://abcd.supabase.co', key: jwt('anon'), google: false } });
    expect(
      readAuthConfig({
        VITE_SUPABASE_URL: 'https://a.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
        VITE_SUPABASE_GOOGLE: 'true',
      }),
    ).toMatchObject({
      ok: true,
      config: { key: 'sb_publishable_123', google: true },
    });
  });

  it('stays off when a value is missing or the URL is not https', () => {
    expect(readAuthConfig({})).toEqual({ ok: false, reason: 'missing' });
    // Supabase hands out either key name, so the hint names both.
    expect(setupProblem(readAuthConfig({}))).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY.*VITE_SUPABASE_ANON_KEY/);
    expect(readAuthConfig({ VITE_SUPABASE_URL: 'https://a.supabase.co' })).toEqual({ ok: false, reason: 'missing' });
    expect(readAuthConfig({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({ ok: false, reason: 'bad-url' });
    expect(readAuthConfig({ VITE_SUPABASE_URL: 'http://a.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      ok: false,
      reason: 'bad-url',
    });
    expect(readAuthConfig({ VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'k' }).ok).toBe(true);
  });

  it('refuses secret keys, which must never reach the browser', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true);
    expect(isSecretKey(jwt('service_role'))).toBe(true);
    expect(isSecretKey(jwt('anon'))).toBe(false);
    expect(isSecretKey('sb_publishable_abc')).toBe(false);
    const s = readAuthConfig({ VITE_SUPABASE_URL: 'https://a.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('service_role') });
    expect(s).toEqual({ ok: false, reason: 'secret-key' });
    expect(setupProblem(s)).toMatch(/secret/);
  });
});

describe('messages', () => {
  it('checks emails and passwords before sending anything', () => {
    expect(emailProblem('')).toMatch(/Enter your email/);
    expect(emailProblem('tracy@')).toMatch(/doesn’t look like/);
    expect(emailProblem(' a@b.co ')).toBeNull();
    expect(passwordProblem('short')).toMatch(/at least 8/);
    expect(passwordProblem('long enough')).toBeNull();
  });

  it('says what to do instead of showing raw errors', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials', code: 'invalid_credentials' })).toMatch(/don’t match/);
    expect(friendlyAuthError({ message: 'Email not confirmed' })).toMatch(/Confirm your email/);
    expect(friendlyAuthError({ message: 'x', status: 429 })).toMatch(/Too many attempts/);
    expect(friendlyAuthError({ message: 'Failed to fetch' })).toMatch(/Couldn’t reach/);
    expect(friendlyAuthError({ message: 'Something new' })).toBe('Something new');
  });
});

describe('sign-in flows', () => {
  let listener: (event: string, session: { user: { email?: string } } | null) => void = () => {};
  const fake = () => {
    const c = {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn((cb: typeof listener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
    } satisfies AuthClient;
    return c;
  };

  beforeEach(() => useAuth.setState({ status: 'off', email: null, panel: null, busy: false, notice: null }));

  it('is off without a client, and the dialog cannot open', () => {
    connectAuth(null);
    useAuth.getState().open('log-in');
    expect(useAuth.getState()).toMatchObject({ status: 'off', panel: null });
  });

  it('follows the session the client reports', async () => {
    const c = fake();
    connectAuth(c);
    await vi.waitFor(() => expect(useAuth.getState().status).toBe('signed-out'));
    listener('SIGNED_IN', { user: { email: 'tracy@example.com' } });
    expect(useAuth.getState()).toMatchObject({ status: 'signed-in', email: 'tracy@example.com' });
    listener('SIGNED_OUT', null);
    expect(useAuth.getState()).toMatchObject({ status: 'signed-out', email: null });
  });

  it('sign-up asks to confirm the email when there is no session yet', async () => {
    const c = fake();
    connectAuth(c);
    useAuth.getState().open('sign-up');
    await useAuth.getState().signUp(' new@example.com ', 'a good password');
    expect(c.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', password: 'a good password' }));
    expect(useAuth.getState().notice).toEqual({ tone: 'ok', text: expect.stringMatching(/Check your email.*new@example\.com/) });
    expect(useAuth.getState().panel).toBe('sign-up');
  });

  it('does not send a sign-up with a short password', async () => {
    const c = fake();
    connectAuth(c);
    await useAuth.getState().signUp('new@example.com', 'short');
    expect(c.signUp).not.toHaveBeenCalled();
    expect(useAuth.getState().notice?.tone).toBe('error');
  });

  it('log-in shows a plain error and keeps the dialog open', async () => {
    const c = fake();
    c.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials', code: 'invalid_credentials' } } as never);
    connectAuth(c);
    useAuth.getState().open('log-in');
    await useAuth.getState().logIn('a@b.co', 'wrong password');
    expect(useAuth.getState()).toMatchObject({
      panel: 'log-in',
      busy: false,
      notice: { tone: 'error', text: expect.stringMatching(/don’t match/) },
    });
    await useAuth.getState().logIn('a@b.co', 'right password');
    expect(useAuth.getState().panel).toBeNull();
  });

  it('log-out signs out of this browser, even when the server cannot be reached', async () => {
    const c = fake();
    c.signOut.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } } as never);
    connectAuth(c);
    listener('SIGNED_IN', { user: { email: 'a@b.co' } });
    await useAuth.getState().logOut();
    expect(c.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(useAuth.getState()).toMatchObject({ status: 'signed-out', email: null, notice: null });
  });

  it('password reset gives the same answer whether or not the account exists', async () => {
    const c = fake();
    connectAuth(c);
    await useAuth.getState().sendReset('someone@example.com');
    expect(useAuth.getState().notice?.text).toMatch(/If an account uses someone@example\.com/);
  });

  it('a reset link opens "choose a new password"', async () => {
    const c = fake();
    connectAuth(c);
    listener('PASSWORD_RECOVERY', { user: { email: 'a@b.co' } });
    expect(useAuth.getState().panel).toBe('new-password');
    await useAuth.getState().saveNewPassword('brand new password');
    expect(c.updateUser).toHaveBeenCalledWith({ password: 'brand new password' });
    expect(useAuth.getState().panel).toBeNull();
  });
});
