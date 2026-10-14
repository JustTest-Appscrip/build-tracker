# Build Tracker

Internal web app for IT teams to publish application build links and for QA to find the latest builds and history.

**Stack:** React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Supabase (Auth + Postgres + RLS) · PWA · Cloudflare Pages

## Quick start

### 1. Install Node.js LTS

Install [Node.js 20+](https://nodejs.org/) (LTS recommended).

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. Open **Project Settings → API**.
3. Copy the **Project URL** and the **anon / public** key.
4. Never use the **service_role** key in this app or in Cloudflare Pages.

### 4. Apply the database migration

1. Open Supabase → **SQL Editor**.
2. Paste the full contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
3. Run it once.

This creates `profiles`, `projects`, `builds`, indexes, RLS policies, and privilege-protection triggers.

### 5. Configure Supabase Auth

1. **Authentication → Providers → Email**: enable Email.
2. For invite-only teams, disable public sign-ups if your plan supports it, or leave sign-up on and approve users via SQL (recommended for MVP).
3. **Authentication → URL configuration**:
   - **Site URL**: your production URL (Cloudflare Pages) or `http://127.0.0.1:43123` for local.
   - **Redirect URLs**: include local and production origins, for example:
     - `http://127.0.0.1:43123/**`
     - `https://your-app.pages.dev/**`

### 6. Approve users and set the first admin

After you create / invite your account:

```sql
update public.profiles
set approved = true, role = 'admin'
where email = 'you@company.com';
```

Approve teammates:

```sql
update public.profiles
set approved = true
where email in ('qa@company.com', 'dev@company.com');
```

Users cannot grant themselves `admin` or `approved` through the client — RLS + triggers block it.

### 7. Create `.env`

```bash
cp .env.example .env
```

Fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 8. Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

### 9. Test CRUD

1. Sign up / sign in with an **approved** account.
2. Create a project.
3. Add a build with only version + HTTPS link.
4. Confirm it appears on the dashboard and in build history.
5. Refresh the browser — data should persist.
6. Try an invalid URL (e.g. `ftp://…`) — it should be rejected.

### 10. Production build & preview

```bash
npm run typecheck
npm run build
npm run preview
```

Preview runs at [http://127.0.0.1:43124](http://127.0.0.1:43124).

### 11. Push to GitHub

Create a repository and push this branch. Do **not** commit `.env`.

### 12. Deploy on Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)
3. Framework preset: Vite (optional).
4. SPA fallback is provided via `public/_redirects`.

### 13. Production environment variables

In Cloudflare Pages → **Settings → Environment variables**, add:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase **anon** key |

Redeploy after saving variables.

Then update Supabase Auth **Site URL** and **Redirect URLs** to the Pages URL.

### 14. Invite approved users

1. Have users register (or invite them from Supabase Auth).
2. Approve their `profiles` row with SQL.
3. Promote admins only when needed.

### 15. Troubleshooting

| Issue | Fix |
| --- | --- |
| “Supabase is not configured” | Set `.env` / Pages env vars and restart / redeploy. |
| Signed in but “Awaiting approval” | Run the approve SQL for that email. |
| Infinite redirect / auth errors | Check Site URL + Redirect URLs in Supabase Auth. |
| Blank routes on refresh | Ensure `public/_redirects` is deployed (`/* /index.html 200`). |
| Duplicate project name | Names are unique case-insensitively. |
| Cannot delete builds | Only admins can delete (RLS). |
| PWA offline | Shell may load; fresh build data requires network. Private links are not cached. |

## Project structure

```
src/
  components/   UI, layout, builds, auth
  contexts/     Auth provider
  lib/          Supabase client, API, validation
  pages/        Dashboard, projects, builds, settings
  types/        Shared TypeScript types
supabase/migrations/  SQL schema + RLS
public/         PWA icons, Cloudflare redirects/headers
```

## Security notes

- Only the Supabase **anon** key is used in the browser.
- All tables have RLS enabled; unauthenticated clients cannot read builds/projects.
- Admin role elevation is blocked client-side and in the database.
- Build URLs must be `http://` or `https://` (client + DB check).
- Service worker uses `NetworkOnly` for Supabase API traffic.

## License

Private / internal use.
