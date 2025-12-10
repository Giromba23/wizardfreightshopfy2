-- Add unique constraint to shopify_rate_extras for upsert operations
ALTER TABLE public.shopify_rate_extras 
ADD CONSTRAINT shopify_rate_extras_rate_zone_unique 
UNIQUE (rate_id, zone_id);