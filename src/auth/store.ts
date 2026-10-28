// Who is signed in, and the sign-in actions. The app works the same without an
// account; sign-in only adds one. The Supabase client is passed in (connectAuth),
// so the forms can be tested with a fake one.
import { create } from 'zustand';
import { emailProblem, friendlyAuthError, passwordProblem } from './messages';

interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

interface SessionLike {
  user: { email?: string | null };
}

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | string;

/** The parts of supabase.auth the app uses. */
export interface AuthClient {
  getSession(): Promise<{ data: { session: SessionLike | null } }>;
  onAuthStateChange(callback: (event: AuthEvent, session: SessionLike | null) => void): { data: { subscription: { unsubscribe(): void } } };
  signUp(credentials: { email: string; password: string; options?: { emailRedirectTo?: string } }): Promise<{
    data: { session: SessionLike | null };
    error: AuthErrorLike | null;
  }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: AuthErrorLike | null }>;
  signInWithOAuth(credentials: { provider: 'google'; options?: { redirectTo?: string } }): Promise<{ error: AuthErrorLike | null }>;
  signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: AuthErrorLike | null }>;
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: AuthErrorLike | null }>;
  updateUser(attributes: { password: string }): Promise<{ error: AuthErrorLike | null }>;
}

export type AuthStatus = 'off' | 'loading' | 'signed-out' | 'signed-in';
export type AuthPanel = 'log-in' | 'sign-up' | 'forgot' | 'new-password';

interface AuthState {
  status: AuthStatus;
  email: string | null;
  /** The open sign-in dialog, if any. */
  panel: AuthPanel | null;
  busy: boolean;
  notice: { tone: 'ok' | 'error'; text: string } | null;
  open(panel: AuthPanel): void;
  close(): void;
  signUp(email: string, password: string): Promise<void>;
  logIn(email: string, password: string): Promise<void>;
  continueWithGoogle(): Promise<void>;
  logOut(): Promise<void>;
  sendReset(email: string): Promise<void>;
  saveNewPassword(password: string): Promise<void>;
}

let client: AuthClient | null = null;

/** Where links in sign-up and reset emails (and Google) bring people back to: this page. */
const returnUrl = () => (typeof window === 'undefined' ? undefined : window.location.origin + window.location.pathname);

export const useAuth = create<AuthState>()((set, get) => {
  /** Runs one request with the busy flag and turns its error into a sentence. Returns true on success. */
  const attempt = async (request: () => Promise<{ error: AuthErrorLike | null }>): Promise<boolean> => {
    set({ busy: true, notice: null });
    try {
      const { error } = await request();
      if (error) {
        set({ notice: { tone: 'error', text: friendlyAuthError(error) } });
        return false;
      }
      return true;
    } catch (e) {
      set({ notice: { tone: 'error', text: friendlyAuthError(e as AuthErrorLike) } });
      return false;
    } finally {
      set({ busy: false });
    }
  };
  const invalid = (problem: string | null) => {
    if (problem) set({ notice: { tone: 'error', text: problem } });
    return !!problem;
  };

  return {
    status: 'off',
    email: null,
    panel: null,
    busy: false,
    notice: null,

    open(panel) {
      if (get().status !== 'off') set({ panel, notice: null });
    },

    close() {
      set({ panel: null, notice: null });
    },

    async signUp(email, password) {
      if (!client || invalid(emailProblem(email) ?? passwordProblem(password))) return;
      let session: SessionLike | null = null;
      const ok = await attempt(async () => {
        const res = await client!.signUp({ email: email.trim(), password, options: { emailRedirectTo: returnUrl() } });
        session = res.data?.session ?? null;
        return res;
      });
      if (!ok) return;
      // With email confirmation on (Supabase's default) there is no session until the link is opened.
      if (session) set({ panel: null });
      else
        set({
          notice: { tone: 'ok', text: `Check your email: open the link we sent to ${email.trim()} to finish creating your account.` },
        });
    },

    async logIn(email, password) {
      if (!client || invalid(emailProblem(email) ?? (password ? null : 'Enter your password.'))) return;
      if (await attempt(() => client!.signInWithPassword({ email: email.trim(), password }))) set({ panel: null });
    },

    async continueWithGoogle() {
      if (!client) return;
      // On success the browser leaves for Google and comes back signed in.
      await attempt(() => client!.signInWithOAuth({ provider: 'google', options: { redirectTo: returnUrl() } }));
    },

    async logOut() {
      if (!client) return;
      // Logs out of this browser only (not every device). The library clears the session here
      // even when it can't reach the server, so the visitor always ends up signed out.
      await attempt(() => client!.signOut({ scope: 'local' }));
      set({ status: 'signed-out', email: null, panel: null, notice: null });
    },

    async sendReset(email) {
      if (!client || invalid(emailProblem(email))) return;
      if (await attempt(() => client!.resetPasswordForEmail(email.trim(), { redirectTo: returnUrl() }))) {
        // The same answer whether or not the account exists, so the form can't be used to discover who has one.
        set({ notice: { tone: 'ok', text: `If an account uses ${email.trim()}, a link to choose a new password is on its way.` } });
      }
    },

    async saveNewPassword(password) {
      if (!client || invalid(passwordProblem(password))) return;
      if (await attempt(() => client!.updateUser({ password }))) set({ panel: null, notice: null });
    },
  };
});

/**
 * Connects the sign-in state to a Supabase client (or turns sign-in off when there is none).
 * Returns a function that stops listening.
 */
export function connectAuth(c: AuthClient | null): () => void {
  client = c;
  if (!c) {
    useAuth.setState({ status: 'off', email: null, panel: null });
    return () => {};
  }
  useAuth.setState({ status: 'loading' });
  const apply = (session: SessionLike | null) =>
    useAuth.setState(session ? { status: 'signed-in', email: session.user.email ?? null } : { status: 'signed-out', email: null });
  void c.getSession().then(({ data }) => apply(data.session));
  const { data } = c.onAuthStateChange((event, session) => {
    apply(session);
    // Arriving from a "reset password" email: ask for the new password right away.
    if (event === 'PASSWORD_RECOVERY') useAuth.setState({ panel: 'new-password', notice: null });
  });
  return () => data.subscription.unsubscribe();
}
