import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { holdFocusInDialog } from '../ui/modal';
import { authSetup } from './client';
import { setupProblem } from './config';
import { MIN_PASSWORD } from './messages';
import { useAuth, type AuthPanel } from './store';

const TITLE: Record<AuthPanel, string> = {
  'log-in': 'Log in',
  'sign-up': 'Create your account',
  forgot: 'Reset your password',
  'new-password': 'Choose a new password',
};

/** The header's account control: Log in / Sign up, or the signed-in email with Log out. */
export function AccountButton() {
  const status = useAuth((s) => s.status);
  const email = useAuth((s) => s.email);
  const open = useAuth((s) => s.open);
  const logOut = useAuth((s) => s.logOut);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  if (status === 'off') {
    // Visitors never see this; while developing, it says why sign-in is missing.
    if (!import.meta.env.DEV) return null;
    return (
      <span
        className="rounded-full px-2.5 py-1 text-[12px] text-navy-400 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.3)]"
        title={setupProblem(authSetup) ?? ''}
      >
        Sign-in not set up
      </span>
    );
  }
  if (status === 'loading') return <span className="h-8 w-20" aria-hidden />;
  if (status === 'signed-out') {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" className="btn-quiet" onClick={() => open('log-in')}>
          Log in
        </button>
        <button type="button" className="btn-primary" onClick={() => open('sign-up')}>
          Sign up
        </button>
      </div>
    );
  }
  const initial = (email ?? '?').charAt(0).toUpperCase();
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] text-navy-200 hover:bg-navy-800 pointer-coarse:min-h-11"
      >
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-teal-400 text-[13px] font-bold text-navy-950">
          {initial}
        </span>
        <span className="hidden max-w-44 truncate sm:inline">{email}</span>
        <span className="sr-only sm:hidden">Account</span>
      </button>
      {menu && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-2xl bg-navy-850 p-2 shadow-[0_0_0_1px_rgb(125_145_181/0.25),0_18px_40px_-16px_rgb(0_0_0/0.8)]"
        >
          <p className="truncate px-2.5 pb-2 pt-1 text-[12.5px] text-navy-300">
            Signed in as <span className="text-navy-100">{email}</span>
          </p>
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold text-navy-100 hover:bg-navy-700 pointer-coarse:min-h-11"
            onClick={() => {
              setMenu(false);
              void logOut();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  type: 'email' | 'password';
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type === 'password' && shown ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className={`field font-sans text-[15px] ${type === 'password' ? 'pr-16' : ''}`}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShown(!shown)}
            className="absolute inset-y-0 right-1 my-auto h-7 rounded-md px-2 text-[12px] font-semibold text-navy-300 hover:text-navy-100"
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-[12px] text-navy-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function Switch({ children, to }: { children: ReactNode; to: AuthPanel }) {
  const open = useAuth((s) => s.open);
  return (
    <button type="button" onClick={() => open(to)} className="font-semibold text-teal-300 underline-offset-2 hover:underline">
      {children}
    </button>
  );
}

/** Sign up, log in, forgotten password and choosing a new password, in one small dialog. */
export function AuthDialog() {
  const panel = useAuth((s) => s.panel);
  // Keyed only by being open: switching between log-in and sign-up keeps the typed email,
  // and closing the dialog discards both fields.
  return panel ? <DialogBody panel={panel} /> : null;
}

function DialogBody({ panel }: { panel: AuthPanel }) {
  const busy = useAuth((s) => s.busy);
  const notice = useAuth((s) => s.notice);
  const { close, signUp, logIn, continueWithGoogle, sendReset, saveNewPassword } = useAuth.getState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Focus stays in the dialog while it is open, and goes back to the button that opened it.
    const release = holdFocusInDialog();
    formRef.current?.querySelector('input')?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      release();
    };
  }, [close]);

  // Switching between log-in, sign-up and reset puts the cursor in the first field again.
  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
  }, [panel]);

  const google = authSetup.ok && authSetup.config.google && (panel === 'log-in' || panel === 'sign-up');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (panel === 'log-in') void logIn(email, password);
    else if (panel === 'sign-up') void signUp(email, password);
    else if (panel === 'forgot') void sendReset(email);
    else void saveNewPassword(password);
  };
  const action = { 'log-in': 'Log in', 'sign-up': 'Create account', forgot: 'Send reset link', 'new-password': 'Save password' }[panel];

  // Drawn outside the app (#root), which is inert while the dialog is open.
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy-950/75 p-4 backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-3xl bg-navy-900 p-6 shadow-[0_0_0_1px_rgb(125_145_181/0.25),0_30px_60px_-20px_rgb(0_0_0/0.85)]"
      >
        <button type="button" onClick={close} className="icon-btn absolute right-3 top-3" aria-label="Close">
          ✕
        </button>
        <h2 id={titleId} className="pr-8 text-[19px] font-extrabold text-navy-50">
          {TITLE[panel]}
        </h2>
        {panel === 'forgot' && <p className="mt-1 text-[13.5px] text-navy-300">We’ll email you a link to choose a new password.</p>}
        {google && (
          <>
            <button type="button" className="btn-outline mt-5 h-10 w-full" disabled={busy} onClick={() => void continueWithGoogle()}>
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-[12px] text-navy-400">
              <span className="h-px flex-1 bg-navy-700" />
              or with email
              <span className="h-px flex-1 bg-navy-700" />
            </div>
          </>
        )}
        <form ref={formRef} onSubmit={submit} className={`flex flex-col gap-3.5 ${google ? '' : 'mt-5'}`} noValidate>
          {panel !== 'new-password' && <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />}
          {panel !== 'forgot' && (
            <Field
              label={panel === 'new-password' ? 'New password' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={panel === 'log-in' ? 'current-password' : 'new-password'}
              hint={panel === 'log-in' ? undefined : `At least ${MIN_PASSWORD} characters.`}
            />
          )}
          {notice && (
            <p
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={`rounded-xl px-3 py-2 text-[13.5px] ${notice.tone === 'error' ? 'bg-rose-400/12 text-rose-100' : 'bg-teal-400/12 text-teal-100'}`}
            >
              {notice.text}
            </p>
          )}
          <button type="submit" className="btn-primary h-10 w-full" disabled={busy}>
            {busy ? 'Working…' : action}
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-navy-300">
          {panel === 'log-in' && (
            <>
              <p>
                <Switch to="forgot">Forgot your password?</Switch>
              </p>
              <p>
                New here? <Switch to="sign-up">Create an account</Switch>
              </p>
            </>
          )}
          {panel === 'sign-up' && (
            <p>
              Already have an account? <Switch to="log-in">Log in</Switch>
            </p>
          )}
          {panel === 'forgot' && (
            <p>
              Remembered it? <Switch to="log-in">Log in</Switch>
            </p>
          )}
          {(panel === 'log-in' || panel === 'sign-up') && (
            <p className="text-navy-400">You can keep using Drawgorithms without an account.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
