# Changing the HeartLink database

Every change to the Supabase database (new table, new column, new function) is a numbered SQL file in
[`migrations/`](migrations/). The [Supabase CLI](https://supabase.com/docs/guides/cli) keeps a list inside
the database of which files have already run, so `db push` only runs the new ones.

> **Heads up:** `staging` and `main` use the **same** Supabase project. A pushed migration changes the
> live database right away, even before the code that needs it is deployed. Only **add** things
> (tables, columns, functions). Don't rename or remove anything the live code still uses.

## Adding a database change

Run these from the `backend` folder.

1. Create the next numbered file in `migrations/`, e.g. `020_add_net_calories.sql`
   (one number higher than the last file). Write the SQL so it is safe to run twice
   (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
2. Preview what will run (changes nothing):

   ```bash
   npx supabase db push --dry-run
   ```

3. Run it:

   ```bash
   npx supabase db push
   ```

4. Commit the new SQL file together with the code that uses it.

To see which migrations have run: `npx supabase migration list`.

## First-time setup on a new computer

```bash
npx supabase login
npx supabase link --project-ref ftzqfojapetmahxfecbm
```

`login` opens the browser. Nothing secret is saved in this repo: the login stays on your computer
and `.temp/` is ignored by git.

## Don't

- Don't edit a migration file that has already run. Fix things in a new numbered file instead.
- Don't run `npx supabase config push`. `config.toml` is only for the local CLI and would overwrite
  the project's auth settings.
- Don't paste migration SQL into the SQL Editor by hand anymore. The CLI wouldn't know it ran.

## History

- 2026-10-14: CLI set up. Migrations 001–010 and 013–019 had been run by hand and were marked as
  applied with `migration repair`. 011 and 012 had never been run; they were pushed with
  `db push --include-all`.
- 2026-10-14: 020 blocked direct table access for the public key and logged-in Supabase users (the apps only use the backend); 021 stored all phones as `+63…` with no duplicates.
- 2026-10-14: 022 added review rounds for the Case Review redesign and rebuilt `expert_evaluations` (it held no rows). 023 fixed the admin dashboard function, which still read a column 022 removed.
  Lesson: before dropping or rebuilding a table, search the migrations for functions that use it (`grep -rn <table> migrations/`).
- `seed/` holds sample content (clinics, exercises, recipes). It is not run by `db push`.
