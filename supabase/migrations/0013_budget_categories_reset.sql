-- Reset legacy budget_categories table to the flexible org-scoped schema.
-- The initial budgeting prototype stored category lines tied directly to budgets,
-- which does not include the metadata fields (name, group_name, icon, etc.)
-- required by the current application. This migration drops the legacy schema
-- when detected and recreates the consolidated structure introduced in 0011.

-- Drop the legacy table (and its triggers/policies) if it still matches
-- the old budgeting prototype signature that included budget_id/activity fields.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'budget_categories'
       AND column_name = 'budget_id'
  ) THEN
    -- Remove legacy triggers/policies so we can drop the table cleanly.
    EXECUTE 'drop trigger if exists t_budget_categories_touch on public.budget_categories';
    EXECUTE 'drop trigger if exists t_budget_category_audit on public.budget_categories';
    EXECUTE 'drop policy if exists "budget_cats_own" on public.budget_categories';

    -- The legacy table references public.budgets, so cascade any dependent views.
    EXECUTE 'drop table if exists public.budget_categories cascade';
  END IF;
END;
$$;

-- Ensure the new schema, policies, indexes and audit triggers are installed.
SELECT public.ensure_budget_category_schema();
SELECT public.ensure_budget_category_policies();
SELECT public.ensure_budget_category_indexes();
SELECT public.ensure_budget_category_audit_triggers();

-- Seed every known organization/profile with the default categories so the
-- budgeting screen always has the starter groups ready.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.seed_default_budget_categories(r.id);
  END LOOP;
END;
$$;
