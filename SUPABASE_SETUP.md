# Supabase setup

## Status

| Step | State |
| --- | --- |
| Project `mhjeecerdqwkjnaputzt` (BlocksFund org; replaced the lost `emsdruoczxumkpybvxot` and `jugylopmjqidimymhapv`) | ✅ done |
| **Rename the project to JustSplit** (dashboard shows the old name `typeai-dev`) | ⛔ needs you — §1 |
| Schema + RLS applied (all migrations, 0001-0018) | ✅ done |
| `.env.local` written with URL + publishable key | ✅ done |
| Generated types in `src/types/database.ts` | ✅ done |
| Google sign-in in the app | ✅ done — button on sign-in and sign-up |
| **Google provider + redirect URLs** | ⛔ needs you — §4 below |
| **Email confirmation setting** | ⛔ your call — §5 below |
| Phase 3 recovery schema (migrations 0003, 0004) | ✅ done |
| `password-recovery` edge function | switched off (stub returning 410) — see §7 |
| Phase 8 profile-photo sync (migration 0016) | ✅ done |
| Phase 9 claim people by email (migration 0017) | ✅ done |
| Phase 10 add people by searching accounts (migration 0018) | ✅ done |
| GitHub Actions secrets point at the new project | ✅ done |

Everything reachable through the management API is finished. What remains lives
in the Supabase and Google dashboards behind your login.

## 1. Project — done

Project `mhjeecerdqwkjnaputzt` in the BlocksFund org, region `ap-south-1`,
Postgres 17. It was the empty `typeai-dev` project, cleared and rebuilt from
`supabase/migrations/` on 2026-10-26, and starts with no users or data.

Two earlier projects are gone: `jugylopmjqidimymhapv` (ClaudeProjectsDB org,
paused on inactivity, then deleted) and `emsdruoczxumkpybvxot` (Mahesh's Org,
deleted on 2026-10-22). Free projects pause after a week without traffic, so
keep an eye on this one.

Rename it in the dashboard so it is easy to find: **Project Settings** →
**General** → **Project name** → `JustSplit`. The name is a label only; the
URL and keys do not change.

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

## 4. Google sign-in

**Google is the only way in** (since 2026-11-09). The email/password form,
sign-up and password-reset pages are gone; `/signup` and `/forgot-password`
redirect to `/login`. Accounts created earlier with an email and password are
linked to Google automatically when the Gmail address matches (Supabase links
identities with the same confirmed email), so their data carries over. To stop
new email sign-ups at the API as well, switch off **Authentication → Sign In /
Providers → Email** — the app no longer offers it either way.

The app has a **Continue with Google** button on both the sign-in and sign-up
screens. Until the provider below is switched on, pressing it shows "Google
sign-in is not switched on yet" rather than a Supabase error page. Google
accounts arrive with their name and photo, so they skip the photo step.

**a. Google Cloud** — [console.cloud.google.com](https://console.cloud.google.com)
→ **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:

| Field | Value |
| --- | --- |
| Application type | Web application |
| Authorized JavaScript origins | `https://thisismaheshj.github.io` and `http://localhost:5173` |
| Authorized redirect URIs | `https://mhjeecerdqwkjnaputzt.supabase.co/auth/v1/callback` |

If asked to set up the consent screen first: External, app name JustSplit, your
email as support and developer contact. Scopes `email`, `profile` and `openid`
are the defaults and are all that is needed. Publish the app (or add each
friend as a test user), or only you will be able to sign in.

**b. Supabase** — **Authentication** → **Sign In / Providers** → **Google**:
switch it on and paste the client ID and client secret from step a.

**c. Supabase** — **Authentication** → **URL Configuration**:

| Field | Value |
| --- | --- |
| Site URL | `https://thisismaheshj.github.io/justsplit/` |
| Redirect URLs | `https://thisismaheshj.github.io/justsplit/auth/callback` and `http://localhost:5173/auth/callback` |

Without the redirect URLs, Google sends people to the Site URL instead of the
callback and the sign-in never completes.

### Brand verification (so Google's screen says JustSplit)

Until Google verifies the brand, its sign-in screen shows
`mhjeecerdqwkjnaputzt.supabase.co` instead of the app's name. The app uses only
`openid`, `email` and `profile`, so this is the quick brand review (a few
business days), not a security assessment.

Google Cloud → **Google Auth Platform → Branding**:

| Field | Value |
| --- | --- |
| App name | `JustSplit` (must match the name on the home page) |
| App logo | `public/logo-120.png` (120×120) |
| Application home page | `https://thisismaheshj.github.io/justsplit/` |
| Privacy policy | `https://thisismaheshj.github.io/justsplit/privacy.html` |
| Terms of service | leave empty |
| Authorized domains | `thisismaheshj.github.io` and `mhjeecerdqwkjnaputzt.supabase.co` |

**Audience** must be *In production*. Then **Verification Center → Verify branding**.

Domain ownership: Google wants `thisismaheshj.github.io` verified in
[Search Console](https://search.google.com/search-console) as a URL-prefix
property for `https://thisismaheshj.github.io/` (the root, not `/justsplit/`).
The HTML-file method needs that file served from the root, which on GitHub
Pages means a repository named `thisismaheshj.github.io` holding it.

What the review looks at on our side, all in place: the sign-in screen shows
the name and says what the app does, links to the privacy policy, and the
policy covers Google user data under the Limited Use requirements.

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

> **Switched off on 2026-11-09.** With Google as the only sign-in there is no
> password to reset. Migration 0020 revoked access to the recovery functions,
> the `password-recovery` edge function is now a stub that answers 410, and the
> app's question screens are gone. The rest of this section describes the old
> flow; the functions and `user_recovery` table are kept so it can be restored.

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
supabase functions deploy password-recovery --no-verify-jwt
```

JWT verification is off on purpose. The callers are signed out, and the app
uses a publishable key (`sb_publishable_…`), which is not a JWT, so the
gateway would reject every call. The function does its own checking: bcrypt
answers in Postgres and a lockout after five wrong tries.

The service-role key it uses is injected by the platform as
`SUPABASE_SERVICE_ROLE_KEY`; it is never checked in and never reaches the browser.


## 8. Required profile photo (Phase 8)

Every account must have a name and a photo before the app opens. New sign-ups
go sign up → add photo → security questions; an existing account without a
photo is sent to the photo step on its next visit.

- The photo is centre-cropped to a 320px JPEG in the browser (~5-15KB) and
  stored as a data URL in `profiles.avatar_url`. No Storage bucket is needed.
- Fellow group members cannot read your profile (RLS keeps it private), so the
  photo and name are copied onto every `group_members` row linked to your
  account. Migration `0016_member_seats_mirror_profile.sql` does this with two
  triggers, so every write path (creating a group, importing, editing) stays
  in step. Apply it in the SQL editor or with `supabase db push`.
- Saving a profile also updates your existing seats from the client, so the
  photo shows up immediately without waiting on a reload.
- Google accounts take their name and photo from Google, so they skip this
  step.


## 9. Bringing past groups across: claim people by email (Phase 9)

Before accounts existed, each browser kept one group in `localStorage`, and
everyone in it was just a name. To move one across:

1. Whoever has the old group signs up **on that same device and browser**.
   The setup screen offers to import it; the people arrive as members with
   no account ("ghosts"), history intact.
2. Give each ghost an email: People → the person → Edit → Email, or in SQL:
   `update public.group_members set invite_email = 'rahul@example.com'
   where group_id = '…' and name = 'Rahul' and user_id is null;`
3. When someone signs up with that email, migration 0017 hands them the
   seat. Every expense and settlement already recorded against it is now
   theirs, and the group appears on their dashboard. If they already have an
   account, the link happens as soon as the email is saved.

Only a **confirmed** email claims a seat. With "Confirm email" switched off,
Supabase confirms every address at signup, so anyone who signs up with a
friend's email before the friend does gets the friend's seat and can see
that group. Switch confirmation back on (Authentication → Sign In /
Providers → Email) to close that; no code change is needed.


## 10. Adding people: accounts only (Phase 10)

New people join a group by being found, not typed in. Creating a group asks
for a name and currency, then lets you search for friends who already have
an account; People → Add people does the same for an existing group. Each
person added gets a seat tied to their account, so the group is on their
dashboard the next time they open the app, with the same rights as you.

`search_accounts()` (migration 0018) is the only way to look across
profiles, which RLS otherwise keeps private. It needs a signed-in caller and
at least two characters, matches names by substring or a full email exactly,
returns at most eight people, and shows name, photo and a masked email
(`r•••@gmail.com`), never the address. Accounts without a photo are not
listed, since they have not finished signing up.

The trade-off: any signed-in user can find anyone else by name. That is what
makes "search and add" work; restricting it would mean invite links instead.

People without an account still exist in groups imported from before
accounts (§9). They can be renamed or given an email to be claimed, but new
ones can no longer be created.


## 11. Hosting and backups

**Hosting.** GitHub Pages, at `https://thisismaheshj.github.io/justsplit/`,
deployed by `.github/workflows/deploy.yml` on every push to `main`. A move to
Vercel was tried on 2026-11-09 and rolled back: it would have tied the app to
a Vercel account already over its free limits, and made everyone sign in
again on a new address. A custom domain (about $10 a year) is the way to a
cleaner URL; GitHub Pages supports one directly.

**Keep-alive.** `.github/workflows/keep-alive.yml` queries the database every
three days so the free project never pauses, and re-enables its own schedule
so GitHub's 60-day inactivity switch-off never applies.

**Backups.** The free plan keeps none. `scripts/backup.sh` runs from launchd
on the developer's Mac (installed by `scripts/install-backup.sh`) and writes a
weekly copy to `~/Backups/JustSplit/`, keeping 26:

- `public.sql.gz` — every app table, schema and rows.
- `auth-users.sql.gz` — the accounts (`auth.users`, `auth.identities`), rows only.

One-time setup: `scripts/backup.sh --setup`, then paste the **Session pooler**
connection string (dashboard → **Connect**) with the database password in it.
It is kept in the login Keychain. `scripts/backup.sh --now` takes one at once.

To restore into a **new, empty** project (not one the migrations have run on):

1. `gunzip -c auth-users.sql.gz | psql "$URI"` — accounts first, while no
   triggers exist on `auth.users` to react to them.
2. `gunzip -c public.sql.gz | psql "$URI"` — tables, rows, functions and
   row-level-security policies, exactly as they were.
3. Re-create the three triggers that live on `auth.users`, which a `public`
   copy cannot carry: the `create trigger` statements at the end of
   `0001_auth_profiles.sql` (`on_auth_user_created`) and
   `0017_claim_seats_by_email.sql` (`on_auth_user_created_claim_seats`,
   `on_auth_user_confirmed_claim_seats`).
4. Redeploy the `password-recovery` edge function (§7).
