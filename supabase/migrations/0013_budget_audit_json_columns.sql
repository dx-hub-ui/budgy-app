-- Ensure legacy budget_audit tables gain the jsonb before/after columns.
DO $$
BEGIN
  -- Add the modern jsonb columns when missing.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'budget_audit'
       AND column_name = 'before'
  ) THEN
    ALTER TABLE public.budget_audit
      ADD COLUMN before jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'budget_audit'
       AND column_name = 'after'
  ) THEN
    ALTER TABLE public.budget_audit
      ADD COLUMN after jsonb;
  END IF;

  -- Promote legacy integer audit columns into jsonb payloads.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'budget_audit'
       AND column_name = 'before_cents'
  ) THEN
    UPDATE public.budget_audit
       SET before = jsonb_build_object('amount_cents', before_cents)
     WHERE before IS NULL AND before_cents IS NOT NULL;

    ALTER TABLE public.budget_audit
      DROP COLUMN before_cents;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'budget_audit'
       AND column_name = 'after_cents'
  ) THEN
    UPDATE public.budget_audit
       SET after = jsonb_build_object('amount_cents', after_cents)
     WHERE after IS NULL AND after_cents IS NOT NULL;

    ALTER TABLE public.budget_audit
      DROP COLUMN after_cents;
  END IF;
END;
$$;
