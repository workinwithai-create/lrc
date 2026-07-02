# shared-auth — Phase 2 scaffold (NOT ACTIVE)

Nothing in this folder is imported anywhere yet. It's the ready-to-apply kit
for the supervised Phase 2 cutover:

- `supabase-shared.ts` — Supabase browser client with the cookie scoped to
  `.workinwithai.com`, so signing in on one app signs you in everywhere.
- `access.ts` — `hasAccess(userId, product)`: passes if the user owns that
  app's subscription OR the Forge Pass bundle. One code path for both.

Do not wire these in outside the supervised session — swapping the cookie
domain logs out existing sessions, and the `entitlements` table doesn't
exist until its migration is run.
