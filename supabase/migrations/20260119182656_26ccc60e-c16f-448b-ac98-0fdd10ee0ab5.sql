-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create seating_projects table
CREATE TABLE public.seating_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  cell_size TEXT NOT NULL DEFAULT 'medium',
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seating_projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view their own projects" 
ON public.seating_projects 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create their own projects" 
ON public.seating_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects" 
ON public.seating_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects" 
ON public.seating_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_seating_projects_updated_at
BEFORE UPDATE ON public.seating_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update guests table to support project association
ALTER TABLE public.guests ADD COLUMN project_id UUID REFERENCES public.seating_projects(id) ON DELETE CASCADE;

-- Update RLS policies for guests to include project ownership
DROP POLICY IF EXISTS "Anyone can view guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can update guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can delete guests" ON public.guests;

-- New policies with project ownership
CREATE POLICY "Users can view guests in their projects" 
ON public.guests 
FOR SELECT 
USING (
  project_id IS NULL 
  OR 
  EXISTS (
    SELECT 1 FROM public.seating_projects 
    WHERE seating_projects.id = guests.project_id 
    AND seating_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert guests in their projects" 
ON public.guests 
FOR INSERT 
WITH CHECK (
  project_id IS NULL 
  OR 
  EXISTS (
    SELECT 1 FROM public.seating_projects 
    WHERE seating_projects.id = guests.project_id 
    AND seating_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update guests in their projects" 
ON public.guests 
FOR UPDATE 
USING (
  project_id IS NULL 
  OR 
  EXISTS (
    SELECT 1 FROM public.seating_projects 
    WHERE seating_projects.id = guests.project_id 
    AND seating_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete guests in their projects" 
ON public.guests 
FOR DELETE 
USING (
  project_id IS NULL 
  OR 
  EXISTS (
    SELECT 1 FROM public.seating_projects 
    WHERE seating_projects.id = guests.project_id 
    AND seating_projects.user_id = auth.uid()
  )
);