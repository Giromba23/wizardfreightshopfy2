-- Tabela para alterações pendentes de aprovação
CREATE TABLE public.pending_rate_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  proposed_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  proposed_by TEXT NOT NULL DEFAULT 'agent',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT
);

-- Tabela para logs de alterações
CREATE TABLE public.rate_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  action TEXT NOT NULL CHECK (action IN ('proposed', 'approved', 'rejected', 'applied')),
  performed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_rate_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_change_logs ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sem autenticação)
CREATE POLICY "Allow all operations on pending_rate_changes" 
ON public.pending_rate_changes FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on rate_change_logs" 
ON public.rate_change_logs FOR ALL 
USING (true) WITH CHECK (true);