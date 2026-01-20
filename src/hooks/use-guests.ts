import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Guest } from "@/features/seating/types";

export function useGuests(projectId: string) {
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchGuests = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapped: Guest[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        bdNo: row.bd_no || "",
        gradationNo: row.gradation_no ?? undefined,
        dateCommission: row.date_commission ?? "",
        role: row.role as Guest["role"],
        referenceId: row.reference_id ?? undefined,
        beforeAfter: row.before_after as Guest["beforeAfter"] | undefined,
        spousePosition: row.spouse_position as Guest["spousePosition"],
      }));

      setGuests(mapped);
    } catch (error) {
      console.error("Error fetching guests:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    fetchGuests();

    const channel = supabase
      .channel(`guests_changes_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchGuests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGuests, projectId]);

  const addGuest = async (guest: Omit<Guest, "id">) => {
    const { error } = await supabase.from("guests").insert({
      project_id: projectId,
      name: guest.name,
      bd_no: guest.bdNo,
      gradation_no: guest.gradationNo ?? null,
      date_commission: guest.dateCommission || null,
      role: guest.role,
      reference_id: guest.referenceId ?? null,
      before_after: guest.beforeAfter ?? null,
      spouse_position: guest.spousePosition,
    });

    if (error) {
      console.error("Error adding guest:", error);
      throw error;
    }
  };

  const updateGuest = async (id: string, guest: Omit<Guest, "id">) => {
    const { error } = await supabase
      .from("guests")
      .update({
        project_id: projectId,
        name: guest.name,
        bd_no: guest.bdNo,
        gradation_no: guest.gradationNo ?? null,
        date_commission: guest.dateCommission || null,
        role: guest.role,
        reference_id: guest.referenceId ?? null,
        before_after: guest.beforeAfter ?? null,
        spouse_position: guest.spousePosition,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating guest:", error);
      throw error;
    }
  };

  const deleteGuest = async (id: string) => {
    const { error } = await supabase.from("guests").delete().eq("id", id);

    if (error) {
      console.error("Error deleting guest:", error);
      throw error;
    }
  };

  return {
    guests,
    loading,
    addGuest,
    updateGuest,
    deleteGuest,
  };
}
