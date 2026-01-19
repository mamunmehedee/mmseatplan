-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bd_no TEXT,
  gradation_no INTEGER,
  date_commission DATE,
  role TEXT NOT NULL CHECK (role IN ('Regular', 'Chief Guest', 'Custom')),
  reference_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  before_after TEXT CHECK (before_after IN ('Before', 'After')),
  spouse_position TEXT NOT NULL DEFAULT 'N/A' CHECK (spouse_position IN ('N/A', 'Before', 'After')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Public access policies (since this is a single-user seating planner tool)
CREATE POLICY "Anyone can view guests"
  ON public.guests
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert guests"
  ON public.guests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update guests"
  ON public.guests
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete guests"
  ON public.guests
  FOR DELETE
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();