// The Supabase client, created only when .env.local has a project URL and a public key.
import { createClient } from '@supabase/supabase-js';
import { readAuthConfig } from './config';
import type { AuthClient } from './store';

export const authSetup = readAuthConfig(import.meta.env);

export const authClient: AuthClient | null = authSetup.ok
  ? createClient(authSetup.config.url, authSetup.config.key, {
      // The session is kept in this browser and refreshed automatically; links from
      // confirmation and reset emails are picked up from the address bar.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }).auth
  : null;
