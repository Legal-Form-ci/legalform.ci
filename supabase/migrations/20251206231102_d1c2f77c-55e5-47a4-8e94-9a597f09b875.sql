
-- =====================================================
-- MIGRATION COMPLÈTE LÉGAL FORM
-- =====================================================

-- 1. Créer les types d'enum pour les rôles internes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'internal_role') THEN
    CREATE TYPE public.internal_role AS ENUM ('admin', 'service_client', 'superviseur', 'comptable', 'controle_qualite');
  END IF;
END $$;

-- 2. Table des utilisateurs internes (équipe Légal Form)
CREATE TABLE IF NOT EXISTS public.internal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role internal_role NOT NULL DEFAULT 'service_client',
  full_name text NOT NULL,
  phone text,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.internal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view internal users" ON public.internal_users
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage internal users" ON public.internal_users
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 3. Table des tickets/demandes de support
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('company', 'service')),
  assigned_to uuid REFERENCES public.internal_users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_client', 'pending_admin', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes_internal text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  closed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tickets" ON public.tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_requests WHERE company_requests.id = tickets.request_id AND company_requests.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM service_requests WHERE service_requests.id = tickets.request_id AND service_requests.user_id = auth.uid()
    )
  );

-- 4. Table pour l'historique des actions
CREATE TABLE IF NOT EXISTS public.action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('company', 'service')),
  action_type text NOT NULL,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_by_role text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage action history" ON public.action_history
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their action history" ON public.action_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_requests WHERE company_requests.id = action_history.request_id AND company_requests.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM service_requests WHERE service_requests.id = action_history.request_id AND service_requests.user_id = auth.uid()
    )
  );

-- 5. Table pour les paiements
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('company', 'service')),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount integer NOT NULL,
  currency text DEFAULT 'XOF',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_id text,
  fedapay_transaction_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create payments" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6. Table des paramètres du site
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  category text DEFAULT 'general',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public settings" ON public.site_settings
  FOR SELECT USING (category = 'public');

CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 7. Table des notifications utilisateurs
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read boolean DEFAULT false,
  link text,
  request_id uuid,
  request_type text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.user_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.user_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. Ajouter les colonnes manquantes aux tables existantes
-- company_associates - ajout des champs pour pièces d'identité
ALTER TABLE public.company_associates 
  ADD COLUMN IF NOT EXISTS id_recto_url text,
  ADD COLUMN IF NOT EXISTS id_verso_url text,
  ADD COLUMN IF NOT EXISTS has_filiation boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS filiation_document_url text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS birth_place text;

-- company_requests - ajout du champ payment_status
ALTER TABLE public.company_requests 
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- 9. Trigger pour historique des actions
CREATE OR REPLACE FUNCTION public.log_request_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.action_history (
    request_id,
    request_type,
    action_type,
    performed_by,
    performed_by_role,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_ARGV[0],
    TG_OP,
    auth.uid(),
    CASE WHEN has_role(auth.uid(), 'admin') THEN 'admin' ELSE 'client' END,
    TG_OP || ' on ' || TG_TABLE_NAME,
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 10. Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Appliquer les triggers updated_at
DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at 
  BEFORE UPDATE ON public.tickets 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS internal_users_updated_at ON public.internal_users;
CREATE TRIGGER internal_users_updated_at 
  BEFORE UPDATE ON public.internal_users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. Insérer les paramètres par défaut du site
INSERT INTO public.site_settings (key, value, category) VALUES
  ('site_name', '"Légal Form"', 'general'),
  ('site_tagline', '"Créer, gérer et accompagner votre entreprise"', 'general'),
  ('contact_phone', '"+225 01 71 50 04 73"', 'contact'),
  ('contact_whatsapp', '"+225 07 09 67 79 25"', 'contact'),
  ('contact_email', '"contact@legalform.ci"', 'contact'),
  ('address', '"BPM 387, Grand-Bassam, ANCIENNE CIE, Côte d''Ivoire"', 'contact'),
  ('price_abidjan', '180000', 'pricing'),
  ('price_interior', '150000', 'pricing')
ON CONFLICT (key) DO NOTHING;

-- 12. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tickets_request_id ON public.tickets(request_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_action_history_request_id ON public.action_history(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON public.payments(request_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
