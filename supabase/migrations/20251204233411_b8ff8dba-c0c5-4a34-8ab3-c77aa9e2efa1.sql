-- Create table for carrier service base rates (price per kg per country)
CREATE TABLE public.carrier_base_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  zone_id TEXT,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  min_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  estimated_days_min INTEGER DEFAULT 10,
  estimated_days_max INTEGER DEFAULT 65,
  service_name TEXT NOT NULL DEFAULT 'Standard Shipping',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(country_code, service_name)
);

-- Enable RLS
ALTER TABLE public.carrier_base_rates ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations on carrier_base_rates" 
ON public.carrier_base_rates 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_carrier_base_rates_updated_at
BEFORE UPDATE ON public.carrier_base_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();