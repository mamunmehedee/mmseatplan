import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type SeatProjectListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export function useSeatProjects() {
  const [projects, setProjects] = React.useState<SeatProjectListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("seating_projects")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setProjects(
        (data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          updatedAt: p.updated_at,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel("seating_projects_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "seating_projects" }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  const createProject = React.useCallback(async () => {
    setCreating(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const now = new Date();
      const defaultTitle = "Seating Plan";
      const defaultName = `plan-${now.toISOString().replace(/[:.]/g, "-")}`;

      const { data, error } = await supabase
        .from("seating_projects")
        .insert({
          user_id: userId,
          name: defaultName,
          title: defaultTitle,
          cell_size: "medium",
          compact_mode: false,
        })
        .select("id")
        .single();

      if (error) throw error;

      return data.id as string;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    projects,
    loading,
    creating,
    createProject,
  };
}
