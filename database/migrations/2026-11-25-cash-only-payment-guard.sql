-- Cash-only payment guard for existing PostgreSQL installations.
-- Historical card/online rows are intentionally preserved as history; new writes are blocked.
CREATE OR REPLACE FUNCTION public.enforce_ary_cash_only_payment_method()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_method NOT IN ('cash', 'cash_on_delivery') THEN
    RAISE EXCEPTION 'ARY Services accepts cash payment methods only.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS payment_transactions_cash_only_guard ON public.payment_transactions';
    EXECUTE 'CREATE TRIGGER payment_transactions_cash_only_guard
      BEFORE INSERT OR UPDATE OF payment_method ON public.payment_transactions
      FOR EACH ROW EXECUTE FUNCTION public.enforce_ary_cash_only_payment_method()';
  END IF;
END;
$$;
