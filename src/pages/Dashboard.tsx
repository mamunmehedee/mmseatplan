import * as React from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AuthGate from "@/components/AuthGate";
import AccountMenu from "@/components/AccountMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSeatProjects } from "@/hooks/use-seat-projects";

function DashboardInner() {
  const navigate = useNavigate();
  const { projects, loading, creating, createProject } = useSeatProjects();

  const handleCreate = async () => {
    const id = await createProject();
    if (id) navigate(`/projects/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Create a new plan or open a saved one.</p>
            </div>
          </div>

          <AccountMenu />
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="mr-2 size-4" /> {creating ? "Creating…" : "+ Add Seat Plan"}
            </Button>

            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {loading ? (
                <span className="text-sm text-muted-foreground">Loading…</span>
              ) : projects.length === 0 ? (
                <span className="text-sm text-muted-foreground">No saved plans yet.</span>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className={cn(
                      "shrink-0 rounded-md border bg-card px-3 py-2 text-left",
                      "hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                  >
                    <div className="max-w-[220px] truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">Updated {new Date(p.updatedAt).toLocaleString()}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Open a saved plan to edit guests, preview the layout, and export to PNG/PDF.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
