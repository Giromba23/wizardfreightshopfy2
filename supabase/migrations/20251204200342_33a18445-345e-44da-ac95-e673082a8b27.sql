-- Add proposed_rate_name column to pending_rate_changes
ALTER TABLE public.pending_rate_changes
ADD COLUMN proposed_rate_name text;

-- Set default value to rate_name for existing records
UPDATE public.pending_rate_changes
SET proposed_rate_name = rate_name
WHERE proposed_rate_name IS NULL;