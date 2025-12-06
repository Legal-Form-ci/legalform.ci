-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for testimonial photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'testimonial-photos',
  'testimonial-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for company logos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for company-documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for testimonial-photos bucket (public read, authenticated write)
CREATE POLICY "Anyone can view testimonial photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonial-photos');

CREATE POLICY "Authenticated users can upload testimonial photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'testimonial-photos');

-- RLS Policies for company-logos bucket (public read, authenticated write)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Add columns to created_companies for photo and logo URLs
ALTER TABLE public.created_companies 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Allow anyone to insert testimonials (they go for approval)
DROP POLICY IF EXISTS "Public companies are viewable by everyone" ON public.created_companies;

CREATE POLICY "Public companies are viewable by everyone"
ON public.created_companies FOR SELECT
USING (show_publicly = true);

CREATE POLICY "Anyone can submit testimonials"
ON public.created_companies FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all testimonials"
ON public.created_companies FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));