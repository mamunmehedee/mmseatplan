import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SeatingProject {
  id: string;
  user_id: string;
  name: string;
  title: string;
  cell_size: "small" | "medium" | "large";
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export function useProjects(userId: string | undefined) {
  const [projects, setProjects] = useState<SeatingProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("seating_projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects((data || []) as SeatingProject[]);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async (
    name: string,
    title: string,
    cellSize: "small" | "medium" | "large",
    compactMode: boolean
  ) => {
    if (!userId) {
      toast.error("You must be logged in to save projects");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("seating_projects")
        .insert({
          user_id: userId,
          name,
          title,
          cell_size: cellSize,
          compact_mode: compactMode,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Project "${name}" saved`);
      await fetchProjects();
      return data;
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("seating_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Project deleted");
      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const updateProject = async (
    id: string,
    name: string,
    title: string,
    cellSize: "small" | "medium" | "large",
    compactMode: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("seating_projects")
        .update({
          name,
          title,
          cell_size: cellSize,
          compact_mode: compactMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Project "${name}" updated`);
      await fetchProjects();
      return true;
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
      return false;
    }
  };

  return { projects, loading, saveProject, updateProject, deleteProject, refetch: fetchProjects };
}
