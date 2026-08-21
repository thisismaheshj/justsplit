# Supabase setup

## Status

| Step | State |
| --- | --- |
| Project created (`jugylopmjqidimymhapv`, ap-southeast-1) | ✅ done |
| Schema + RLS applied (migrations 0001, 0002) | ✅ done |
| `.env.local` written with URL + publishable key | ✅ done |
| Generated types in `src/types/database.ts` | ✅ done |
| **Google sign-in** | ⛔ needs you — §4 below |
| **Redirect URLs** | ⛔ needs you — §4 below |
| **Email confirmation setting** | ⛔ your call — §5 below |
| Phase 3 recovery schema (migrations 0003, 0004) | ✅ done |
| `password-recovery` edge function deployed | ✅ done |

Everything reachable through the management API is finished. What remains lives
in the Supabase and Google dashboards behind your login.

## 1. Project — done

Project `jugylopmjqidimymhapv` in `ap-southeast-1`, Postgres 17.

## 2. Schema — done

`supabase/migrations/0001_auth_profiles.sql` and `0002_lock_down_trigger_functions.sql`
are applied. This created `public.profiles`, enabled row-level security with
three `auth.uid()`-scoped policies, and added the trigger that creates a profile
on signup. Both files are idempotent, so re-running them is safe.

Verified against the live database:

| Check | Result |
| --- | --- |
| Rows a signed-in user can see | only their own |
| Updating another user's row | 0 rows — silently filtered |
| Updating their own row | 1 row |
| Inserting a row as another user | rejected |
| `updated_at` maintained server-side | yes |

## 3. Local env — done

`.env.local` holds the project URL and the **publishable** key
(`sb_publishable_…`), which is preferred over the legacy anon JWT because it can
be rotated on its own. The file is gitignored.

> Never put the **service_role** key in this app. It bypasses row-level security
> entirely and would be readable by anyone who opens the bundle.

## 4. Turn on Google sign-in — needs you

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type *Web application*.
2. Under **Authorised redirect URIs**, add the callback Supabase gives you:
   `https://<your-project>.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into Supabase → **Authentication** → **Providers**
   → **Google**, and enable it.
4. In Supabase → **Authentication** → **URL Configuration**, add both of these to
   **Redirect URLs**:
   - `http://localhost:5178/auth/callback`
   - `https://<your-github-username>.github.io/justsplit/auth/callback`

The dev port matters: if you run Vite on a different port, add that URL too, or
Google will refuse the round trip.

## 5. Email confirmation — your call

By default Supabase emails a confirmation link before a new account can sign in.
Two options:

- **Leave it on** (recommended for a real deployment) — signup tells the user to
  check their inbox.
- **Turn it off** for local development: **Authentication** → **Providers** →
  **Email** → uncheck *Confirm email*. Signup then logs you straight in.

Note this is separate from password *reset*, which by design never uses email —
see the security-question flow being built in Phase 3.

Supabase also DNS-checks the address on signup, so throwaway domains like
`example.com` are rejected outright. Test with a real inbox.

## 6. Deploying to GitHub Pages

Add the same two values as repository secrets so the build can bake them in:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon key |

The workflow already reads them, and it copies `index.html` to `404.html` so
client-side routes survive a hard refresh.

## Verifying it worked

- `npm run dev` shows the sign-in screen rather than the "Supabase is not
  configured" notice.
- Creating an account adds a row in **Table Editor** → `profiles`.
- Signing out and back in lands you on the app, not on `/login`.


## 7. Password recovery (Phase 3)

Reset works entirely in-app, with no email, per PRD 5.1 Option A.

- Two security questions from a fixed bank, chosen in **Settings → Account**.
- Answers are normalised (case and spacing ignored) and **bcrypt-hashed** by
  Postgres. Neither the client nor the edge function ever sees a hash: the
  answer columns are revoked from `anon` and `authenticated` at the column level.
- Five wrong answers locks recovery for 15 minutes. The client cannot clear its
  own lockout — it has no write access to the table at all; every write goes
  through `set_recovery_questions()`.
- A successful reset **revokes every existing session**, so a stolen laptop is
  signed out too.
- An account with no recovery record cannot be reset. This matters for
  Google-only accounts: until you deliberately set questions, the only way in is
  Google.

### The trade-off, stated plainly

Skipping email means there is no proof of inbox ownership. Anyone who knows your
two answers can take the account. Pick answers that are not on your public
profile — and prefer ones that are effectively passwords rather than facts, since
a real answer to "what city were you born in?" is often a search away.

### Redeploying the function

```
supabase functions deploy password-recovery
```

The service-role key it uses is injected by the platform as
`SUPABASE_SERVICE_ROLE_KEY`; it is never checked in and never reaches the browser.
