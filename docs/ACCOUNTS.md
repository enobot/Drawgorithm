# Accounts (Supabase)

Drawgorithms works without an account. When a Supabase project is configured, the header
shows **Log in** and **Sign up**: email and password (with email confirmation and password
reset), and optionally **Continue with Google**. Without a project, sign-in stays off and the
app works exactly as before (in development the header says "Sign-in not set up").

## Set it up

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **Project Settings → API** (or **API Keys**) and copy:
   - the **Project URL**, like `https://abcd1234.supabase.co`
   - the **anon** key (or the newer **publishable** key, `sb_publishable_…`).
3. In the project folder, copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```
   `.env.local` is ignored by git. Restart `npm run dev` after changing it.
4. **Authentication → URL Configuration**: set **Site URL** to where the app runs (for now
   `http://localhost:5173`) and add the same address, plus your future website address,
   under **Redirect URLs**. Confirmation and password-reset emails link back to these.
5. Try it: Sign up with your own email, open the confirmation link, then log in.

Never put the **service_role** / **secret** key in `.env.local`: everything in that file ends
up in the website. The app refuses to use a secret key if one is put there by mistake.

### Optional: Continue with Google

Turn on **Authentication → Sign In / Providers → Google** (it needs an OAuth client from
Google Cloud; the Supabase page walks through it), then add `VITE_SUPABASE_GOOGLE=true`
to `.env.local`. Until then the Google button is hidden.

### When you put the site online

- Add the two `VITE_SUPABASE_…` values to your host's environment settings (Vercel,
  Netlify, …): `.env.local` is not uploaded.
- Set **Site URL** to the real address and keep it in **Redirect URLs**.
- Supabase's built-in email sender is only meant for testing (it sends very few emails per
  hour). Set up your own SMTP under **Authentication → Emails** before launch.
- Collecting emails needs a **privacy policy** and **terms of use**. Consider turning on
  Supabase's CAPTCHA protection to keep bots from creating accounts.

## How many users do I have?

- **Dashboard**: **Authentication → Users** lists every account, with the total.
- **SQL editor** (dashboard → SQL Editor), read-only queries:

  ```sql
  -- Everyone who signed up
  select count(*) from auth.users;

  -- Accounts that confirmed their email
  select count(*) from auth.users where email_confirmed_at is not null;

  -- Sign-ups per day, newest first
  select date_trunc('day', created_at) as day, count(*) as sign_ups
  from auth.users group by 1 order by 1 desc;

  -- People who logged in during the last 30 days
  select count(*) from auth.users where last_sign_in_at > now() - interval '30 days';
  ```

## How it works

- `src/auth/config.ts` reads the settings and refuses secret keys; `src/auth/client.ts`
  creates the Supabase client only when they are valid.
- `src/auth/store.ts` holds who is signed in and the actions (sign up, log in, Google, log
  out of this browser, reset and new password); `src/auth/AuthUI.tsx` is the header button
  and the dialog. Errors are shown as plain sentences (`src/auth/messages.ts`).
- The session is kept in this browser's storage by Supabase and refreshed automatically.
  Learners' code runs in a sandboxed worker with no access to page storage, so it cannot
  read the session.
- Password reset answers the same way whether or not an account exists, so the form can't
  be used to find out who has an account.

## Not built yet

- Saving code and progress to the account (today they stay in the browser either way).
- Subscriptions: a `profiles` table with a plan, Stripe Checkout, and a server-side webhook
  (for example a Supabase Edge Function) that updates the plan, which the app then reads
  to unlock paid features. The plan must only ever be changed by the server.
