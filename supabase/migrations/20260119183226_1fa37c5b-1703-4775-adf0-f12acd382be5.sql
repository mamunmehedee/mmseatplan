-- Fix RLS policies for guests table to require authentication

DROP POLICY IF EXISTS "Users can view guests in their projects" ON public.guests;
DROP POLICY IF EXISTS "Users can insert guests in their projects" ON public.guests;
DROP POLICY IF EXISTS "Users can update guests in their projects" ON public.guests;
DROP POLICY IF EXISTS "Users can delete guests in their projects" ON public.guests;

-- Create security definer function to check project ownership
CREATE OR REPLACE FUNCTION public.user_owns_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seating_projects
    WHERE id = _project_id
    AND user_id = _user_id
  )
$$;

-- New secure policies requiring authentication
CREATE POLICY "Authenticated users can view guests in their projects" 
ON public.guests 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    project_id IS NULL
    OR public.user_owns_project(auth.uid(), project_id)
  )
);

CREATE POLICY "Authenticated users can insert guests in their projects" 
ON public.guests 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    project_id IS NULL
    OR public.user_owns_project(auth.uid(), project_id)
  )
);

CREATE POLICY "Authenticated users can update guests in their projects" 
ON public.guests 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    project_id IS NULL
    OR public.user_owns_project(auth.uid(), project_id)
  )
);

CREATE POLICY "Authenticated users can delete guests in their projects" 
ON public.guests 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    project_id IS NULL
    OR public.user_owns_project(auth.uid(), project_id)
  )
);