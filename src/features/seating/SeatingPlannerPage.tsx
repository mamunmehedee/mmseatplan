import * as React from "react";
import { Download, Pencil, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGuests } from "@/hooks/use-guests";

import type { Guest, GuestRole, SpousePosition } from "./types";
import { buildArrangement, computeSerialNumbers } from "./seatingLogic";

const defaultGuest: Omit<Guest, "id"> = {
  name: "",
  bdNo: "",
  gradationNo: undefined,
  dateCommission: "",
  role: "Regular",
  referenceId: undefined,
  beforeAfter: "Before",
  spousePosition: "N/A",
};

export default function SeatingPlannerPage() {
  const { guests, loading, addGuest, updateGuest, deleteGuest } = useGuests();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("Seating Plan");

  const editingGuest = React.useMemo(
    () => (editingId ? guests.find((g) => g.id === editingId) ?? null : null),
    [editingId, guests],
  );

  const [form, setForm] = React.useState<Omit<Guest, "id">>(defaultGuest);

  React.useEffect(() => {
    if (!editingGuest) {
      setForm(defaultGuest);
      return;
    }

    setForm({
      name: editingGuest.name,
      bdNo: editingGuest.bdNo,
      gradationNo: editingGuest.gradationNo,
      dateCommission: editingGuest.dateCommission ?? "",
      role: editingGuest.role,
      referenceId: editingGuest.referenceId,
      beforeAfter: editingGuest.beforeAfter ?? "Before",
      spousePosition: editingGuest.spousePosition,
    });
  }, [editingGuest]);

  const { arrangement, error } = React.useMemo(() => buildArrangement(guests), [guests]);
  const { serialNumbers } = React.useMemo(() => computeSerialNumbers(guests, arrangement), [guests, arrangement]);

  const referenceOptions = React.useMemo(() => guests.filter((g) => g.id !== editingId), [guests, editingId]);

  const upsertGuest = async (payload: Omit<Guest, "id">) => {
    try {
      if (!editingId) {
        await addGuest(payload);
      } else {
        await updateGuest(editingId, payload);
      }
      setEditingId(null);
    } catch (error) {
      console.error("Error saving guest:", error);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const role: GuestRole = form.role;
    const cleaned: Omit<Guest, "id"> = {
      ...form,
      name: form.name.trim(),
      bdNo: form.bdNo.trim(),
      dateCommission: form.dateCommission || "",
      gradationNo:
        role === "Regular" || (role === "Custom" && form.gradationNo !== undefined)
          ? Number.isFinite(form.gradationNo as number)
            ? Number(form.gradationNo)
            : undefined
          : undefined,
      referenceId: role === "Custom" ? form.referenceId : undefined,
      beforeAfter: role === "Custom" ? form.beforeAfter : undefined,
    };

    if (!cleaned.name) return;
    if (role === "Regular" && (cleaned.gradationNo === undefined || Number.isNaN(cleaned.gradationNo))) return;

    await upsertGuest(cleaned);
  };

  const handleDeleteGuest = async (id: string) => {
    try {
      await deleteGuest(id);
      if (editingId === id) setEditingId(null);
    } catch (error) {
      console.error("Error deleting guest:", error);
    }
  };

  const toggleSpouse = async (id: string, next: SpousePosition) => {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return;

    try {
      await updateGuest(id, { ...guest, spousePosition: next });
    } catch (error) {
      console.error("Error updating spouse position:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Seating Plan Builder</h1>
              <p className="text-sm text-muted-foreground">Guests → arrangement → seating plan preview.</p>
            </div>
          </div>

          <Button onClick={() => setEditingId(null)}>
            <Plus /> New guest
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit guest" : "Add guest"}</CardTitle>
            <CardDescription>Exactly one “Chief Guest” is required for the plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Name/Appt</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bdNo">BD No</Label>
                  <Input id="bdNo" value={form.bdNo} onChange={(e) => setForm((p) => ({ ...p, bdNo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradationNo">Gradation No</Label>
                  <Input
                    id="gradationNo"
                    type="number"
                    value={form.gradationNo ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        gradationNo: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    required={form.role === "Regular"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateCommission">Date of Commission (optional)</Label>
                <Input
                  id="dateCommission"
                  type="date"
                  value={form.dateCommission ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, dateCommission: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        role: v as GuestRole,
                        referenceId: undefined,
                        beforeAfter: "Before",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Chief Guest">Chief Guest</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Spouse position</Label>
                  <Select
                    value={form.spousePosition}
                    onValueChange={(v) => setForm((p) => ({ ...p, spousePosition: v as SpousePosition }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Spouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      <SelectItem value="Before">Before</SelectItem>
                      <SelectItem value="After">After</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.role === "Custom" ? (
                <div className="rounded-lg border bg-card p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Place</Label>
                      <Select
                        value={form.beforeAfter ?? "Before"}
                        onValueChange={(v) => setForm((p) => ({ ...p, beforeAfter: v as "Before" | "After" }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Before">Before</SelectItem>
                          <SelectItem value="After">After</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Relative to</Label>
                      <Select
                        value={form.referenceId ?? "none"}
                        onValueChange={(v) => setForm((p) => ({ ...p, referenceId: v === "none" ? undefined : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="(optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">(none)</SelectItem>
                          {referenceOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    If “Relative to” is empty, custom guests are placed at the ends (alternating).
                  </p>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? "Update" : "Add"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guests list</CardTitle>
              <CardDescription>Toggle spouse placement directly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2">BD</th>
                      <th className="px-3 py-2">Grad</th>
                      <th className="px-3 py-2">Commission</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Spouse</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {loading ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>
                          Loading guests...
                        </td>
                      </tr>
                    ) : guests.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>
                          Add guests on the left to generate your plan.
                        </td>
                      </tr>
                    ) : (
                      guests.map((g, idx) => (
                        <tr key={g.id} className={cn("border-t", idx % 2 === 1 && "bg-muted/40")}>
                          <td className="px-3 py-2 text-left tabular-nums">{idx + 1}</td>
                          <td className="px-3 py-2 text-left font-medium">{g.name}</td>
                          <td className="px-3 py-2 text-center">{g.bdNo}</td>
                          <td className="px-3 py-2 text-center tabular-nums">{g.gradationNo ?? ""}</td>
                          <td className="px-3 py-2 text-center">{g.dateCommission ?? ""}</td>
                          <td className="px-3 py-2 text-center">{g.role}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={g.spousePosition === "Before" ? "secondary" : "outline"}
                                onClick={() => toggleSpouse(g.id, g.spousePosition === "Before" ? "N/A" : "Before")}
                              >
                                Before
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={g.spousePosition === "After" ? "secondary" : "outline"}
                                onClick={() => toggleSpouse(g.id, g.spousePosition === "After" ? "N/A" : "After")}
                              >
                                After
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button type="button" size="icon" variant="outline" onClick={() => setEditingId(g.id)}>
                                <Pencil />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button type="button" size="icon" variant="destructive" onClick={() => handleDeleteGuest(g.id)}>
                                <Trash2 />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seating plan</CardTitle>
              <CardDescription>Preview generated from your arrangement rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full max-w-md space-y-2">
                  <Label htmlFor="planTitle">Enter the title</Label>
                  <Input id="planTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <Button variant="outline" disabled title="Image export can be re-enabled next">
                  <Download /> Save as image
                </Button>
              </div>

              <Separator />

              <div className="overflow-x-auto rounded-lg border bg-card p-5" aria-label="Seating plan preview">
                <h2 className="mb-4 text-center text-lg font-semibold">{title || "Seating Plan"}</h2>

                {error ? (
                  <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                    {error} (Set one guest to “Chief Guest”.)
                  </div>
                ) : (
                  <table className="mx-auto border-collapse text-sm">
                    <tbody>
                      <tr>
                        {serialNumbers.map((n, i) => (
                          <td key={i} className="border px-3 py-2 text-center tabular-nums">
                            {n === 0 ? "" : n}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        {arrangement.map((name, i) => (
                          <td key={i} className="border px-3 py-2 text-center font-medium">
                            {name}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Data is automatically saved to the backend and synced across sessions.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
