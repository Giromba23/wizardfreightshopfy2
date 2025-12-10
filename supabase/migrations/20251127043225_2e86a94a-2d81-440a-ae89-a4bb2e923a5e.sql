-- Add category field to shopify_rate_extras
ALTER TABLE public.shopify_rate_extras 
ADD COLUMN IF NOT EXISTS category text;

-- Create table for shipping multipliers/formulas
CREATE TABLE public.shipping_multipliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  multiplier numeric NOT NULL DEFAULT 1.0,
  base_quantity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_multipliers ENABLE ROW LEVEL SECURITY;

-- Create policy for shipping_multipliers
CREATE POLICY "Allow all operations on shipping_multipliers" 
ON public.shipping_multipliers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_shipping_multipliers_updated_at
BEFORE UPDATE ON public.shipping_multipliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default multipliers
INSERT INTO public.shipping_multipliers (name, description, multiplier, base_quantity) VALUES
('2 Bicicletas', 'Frete para 2 bicicletas', 1.8, 2),
('3 Bicicletas', 'Frete para 3 bicicletas', 2.5, 3),
('Bike + Roda', 'Bicicleta + roda extra', 1.3, 1),
('Bike + 2 Rodas', 'Bicicleta + 2 rodas extras', 1.5, 1);