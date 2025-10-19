-- Ensure budget_goal has a unique constraint for org/category pairs
-- so API upserts using onConflict work as expected.

-- Deduplicate any existing rows that would violate the constraint.
DO $$
BEGIN
  IF to_regclass('public.budget_goal') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.budget_goal bg
  USING public.budget_goal other
  WHERE bg.org_id = other.org_id
    AND bg.category_id = other.category_id
    AND bg.ctid > other.ctid;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'budget_goal_org_category_key'
      AND conrelid = 'public.budget_goal'::regclass
  ) THEN
    EXECUTE 'alter table public.budget_goal add constraint budget_goal_org_category_key unique (org_id, category_id)';
  END IF;
END
$$;
