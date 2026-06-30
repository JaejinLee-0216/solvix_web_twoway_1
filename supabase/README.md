# Supabase setup for SOLVIX

This repository keeps Supabase database migrations in `supabase/migrations`.
Because the `supabase/` folder is at the repository root, set the Supabase
GitHub Integration **Working directory** to `.`.

Recommended GitHub Integration settings:

- GitHub Repository: `JaejinLee-0216/solvix_web_twoway_1`
- Working directory: `.`
- Deploy to production: enabled
- Production branch name: `main`
- Branching / preview databases: disabled on the Free plan

After creating a new Supabase project, complete these steps:

1. Connect this repository in Supabase using the settings above.
2. Apply `supabase/migrations/20260630000000_initial_schema.sql` to the new
   production database by merging/pushing the migration to `main`, or paste the
   migration into Supabase SQL Editor once if you want to initialize manually.
3. In Vercel, replace the old paused-project values with the new Supabase
   project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Keep AI provider keys in Vercel as server-side environment variables:
   - `DEEPSEEK_API_KEY`
   - `GEMINI_OCR_API_KEY`
5. Redeploy the Vercel project after saving environment variables.
6. Log out and log in with Kakao again so the app can create or update the
   user, subscription, admin, and usage records in the new database.

Do not commit service role keys, anon keys, DeepSeek keys, Gemini keys, or any
other secrets into this repository.
