-- Keep the documented SQL schema aligned with the runtime-supported account roles.
-- The runtime storage initializer does not add this CHECK itself, but installations
-- created from database/schema.sql do.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_type_check;
    ALTER TABLE public.users ADD CONSTRAINT users_account_type_check
      CHECK (account_type IN ('customer', 'provider', 'driver', 'admin'));
  END IF;
END;
$$;
