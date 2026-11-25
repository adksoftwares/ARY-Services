-- Ensure the document store exists even when this migration runs before the API's first startup.
CREATE TABLE IF NOT EXISTS public.ary_documents (
  collection VARCHAR(80) NOT NULL,
  record_id VARCHAR(160) NOT NULL,
  position BIGINT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, record_id)
);
CREATE INDEX IF NOT EXISTS ary_documents_collection_position_idx
  ON public.ary_documents (collection, position);

-- Enforce cash-only payment methods in the JSONB collections used by the live API.
-- Existing historical non-cash values are preserved unless a write attempts to introduce or change them.
CREATE OR REPLACE FUNCTION public.enforce_ary_cash_only_document_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_method TEXT;
  old_method TEXT;
  item JSONB;
  previous_item JSONB;
  new_items JSONB;
  old_items JSONB;
BEGIN
  IF NEW.collection = 'bookings' THEN
    new_method := COALESCE(NEW.payload->>'paymentMethod', NEW.payload->>'payment_method');
    IF TG_OP = 'UPDATE' THEN
      old_method := COALESCE(OLD.payload->>'paymentMethod', OLD.payload->>'payment_method');
    END IF;
    IF (TG_OP = 'INSERT' AND (new_method IS NULL OR lower(new_method) NOT IN ('cash', 'cash_on_delivery')))
      OR (TG_OP = 'UPDATE' AND new_method IS DISTINCT FROM old_method AND new_method IS NOT NULL AND lower(new_method) NOT IN ('cash', 'cash_on_delivery')) THEN
      RAISE EXCEPTION 'ARY Services accepts cash payment methods only.' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.collection = 'grocery_orders' THEN
    new_items := CASE WHEN jsonb_typeof(NEW.payload) = 'array' THEN NEW.payload ELSE '[]'::jsonb END;
    IF TG_OP = 'UPDATE' THEN
      old_items := CASE WHEN jsonb_typeof(OLD.payload) = 'array' THEN OLD.payload ELSE '[]'::jsonb END;
    ELSE
      old_items := '[]'::jsonb;
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(new_items) AS rows(value) LOOP
      SELECT value INTO previous_item
      FROM jsonb_array_elements(old_items) AS rows(value)
      WHERE value->>'id' = item->>'id'
      LIMIT 1;
      new_method := COALESCE(item->>'paymentMethod', item->>'payment_method');
      old_method := COALESCE(previous_item->>'paymentMethod', previous_item->>'payment_method');
      IF (previous_item IS NULL AND (new_method IS NULL OR lower(new_method) NOT IN ('cash', 'cash_on_delivery')))
        OR (previous_item IS NOT NULL AND new_method IS DISTINCT FROM old_method AND new_method IS NOT NULL AND lower(new_method) NOT IN ('cash', 'cash_on_delivery')) THEN
        RAISE EXCEPTION 'ARY Services accepts cash on delivery only.' USING ERRCODE = '23514';
      END IF;
      previous_item := NULL;
    END LOOP;
  ELSIF NEW.collection = 'driver-services' THEN
    new_items := CASE WHEN jsonb_typeof(NEW.payload->'jobs') = 'array' THEN NEW.payload->'jobs' ELSE '[]'::jsonb END;
    IF TG_OP = 'UPDATE' THEN
      old_items := CASE WHEN jsonb_typeof(OLD.payload->'jobs') = 'array' THEN OLD.payload->'jobs' ELSE '[]'::jsonb END;
    ELSE
      old_items := '[]'::jsonb;
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(new_items) AS rows(value) LOOP
      SELECT value INTO previous_item
      FROM jsonb_array_elements(old_items) AS rows(value)
      WHERE value->>'id' = item->>'id'
      LIMIT 1;
      new_method := COALESCE(item->>'paymentMethod', item->>'payment_method');
      old_method := COALESCE(previous_item->>'paymentMethod', previous_item->>'payment_method');
      IF (previous_item IS NULL AND (new_method IS NULL OR lower(new_method) NOT IN ('cash', 'cash_on_delivery')))
        OR (previous_item IS NOT NULL AND new_method IS DISTINCT FROM old_method AND new_method IS NOT NULL AND lower(new_method) NOT IN ('cash', 'cash_on_delivery')) THEN
        RAISE EXCEPTION 'ARY Services accepts cash payment methods only.' USING ERRCODE = '23514';
      END IF;
      previous_item := NULL;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.ary_documents') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS ary_documents_cash_only_guard ON public.ary_documents';
    EXECUTE 'CREATE TRIGGER ary_documents_cash_only_guard
      BEFORE INSERT OR UPDATE OF payload ON public.ary_documents
      FOR EACH ROW EXECUTE FUNCTION public.enforce_ary_cash_only_document_payment()';
  END IF;
END;
$$;
