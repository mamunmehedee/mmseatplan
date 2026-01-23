import * as React from "react";
import { Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Armchair, ArrowLeft, Download, Save, Trash2, Users, Pencil, Printer } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AccountMenu from "@/components/AccountMenu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useGuests } from "@/hooks/use-guests";
import { toast } from "@/hooks/use-toast";

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

export default function SeatingPlannerPage({ projectId }: { projectId: string }) {
  const { guests, loading, addGuest, updateGuest, deleteGuest } = useGuests(projectId);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("Seating Plan");
  const [exporting, setExporting] = React.useState(false);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [pdfPaper, setPdfPaper] = React.useState<"a4" | "letter">("a4");
  // Margin selector intentionally omitted from the UI per request; keep a fixed default margin.
  const pdfMarginPt = 36;
  const [cellSize, setCellSize] = React.useState<"small" | "medium" | "large">("medium");
  // Compact density is now controlled by a slider (0–100).
  // We still persist the legacy boolean `compact_mode` for backwards compatibility.
  const [compactLevel, setCompactLevel] = React.useState<number>(0);
  // Per-row height (vertical density) without changing widths.
  const [rowHeight, setRowHeight] = React.useState<"normal" | "compact" | "ultra">("normal");
  const [tagsFontSize, setTagsFontSize] = React.useState<number>(16);

  const [projectLoading, setProjectLoading] = React.useState(true);
  const [savingProject, setSavingProject] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "error">("saved");

  const initialLoadRef = React.useRef(true);
  const saveTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      setProjectLoading(true);
      try {
        const { data, error } = await supabase
          .from("seating_projects")
          .select("title, cell_size, compact_mode")
          .eq("id", projectId)
          .single();

        if (!mounted) return;
        if (error) throw error;

        initialLoadRef.current = true;
        setTitle(data.title ?? "Seating Plan");
        setCellSize((data.cell_size as "small" | "medium" | "large") ?? "medium");
        setCompactLevel(Boolean(data.compact_mode) ? 60 : 0);
        setSaveStatus("saved");
      } catch {
        if (!mounted) return;
        setSaveStatus("error");
      } finally {
        if (!mounted) return;
        setProjectLoading(false);
        initialLoadRef.current = false;
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const forceSaveProject = React.useCallback(async () => {
    try {
      setSavingProject(true);
      setSaveStatus("saving");

      const compactMode = compactLevel >= 34;

      const { error } = await supabase
        .from("seating_projects")
        .update({
          title: title.trim() || "Seating Plan",
          cell_size: cellSize,
          compact_mode: compactMode,
        })
        .eq("id", projectId);

      if (error) throw error;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      setSavingProject(false);
    }
  }, [cellSize, compactLevel, projectId, title]);

  React.useEffect(() => {
    if (projectLoading) return;
    if (initialLoadRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      void forceSaveProject();
    }, 500);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [cellSize, compactLevel, forceSaveProject, projectLoading, title]);

  const planExportRef = React.useRef<HTMLDivElement | null>(null);

  const cellSizeClass = React.useMemo(() => {
    const tier: "normal" | "compact" | "ultra" = compactLevel >= 67 ? "ultra" : compactLevel >= 34 ? "compact" : "normal";

    const padding =
      tier === "compact"
        ? {
            // Ensure text doesn't touch borders – add breathing room on all sides.
            small: { cell: "px-1 py-1", name: "px-1 py-1" },
            medium: { cell: "px-1 py-1", name: "px-1 py-1" },
            large: { cell: "px-1.5 py-1", name: "px-1.5 py-1" },
          }
        : tier === "ultra"
          ? {
              // Vertical text needs slight padding to avoid clipping at borders.
              small: { cell: "px-0.5 py-1", name: "px-0.5 py-1" },
              medium: { cell: "px-0.5 py-1", name: "px-0.5 py-1" },
              large: { cell: "px-1 py-1", name: "px-1 py-1" },
            }
          : {
              small: { cell: "px-2 py-1.5", name: "px-2 py-2" },
              medium: { cell: "px-3 py-2", name: "px-3 py-2.5" },
              large: { cell: "px-4 py-2.5", name: "px-4 py-3" },
            };

    const widths =
      tier === "compact"
        ? {
            small: "w-16 max-w-16 min-w-16",
            medium: "w-24 max-w-24 min-w-24",
            large: "w-32 max-w-32 min-w-32",
          }
        : tier === "ultra"
          ? {
              small: "w-12 max-w-12 min-w-12",
              medium: "w-16 max-w-16 min-w-16",
              large: "w-20 max-w-20 min-w-20",
            }
          : {
              small: "w-24 max-w-24 min-w-24",
              medium: "w-32 max-w-32 min-w-32",
              large: "w-40 max-w-40 min-w-40",
            };

    const map = {
      small: {
        cell: cn(widths.small, "text-xs", padding.small.cell),
        name: cn(widths.small, "text-xs", padding.small.name),
      },
      medium: {
        cell: cn(widths.medium, "text-sm", padding.medium.cell),
        name: cn(widths.medium, "text-sm", padding.medium.name),
      },
      large: {
        cell: cn(widths.large, "text-sm", padding.large.cell),
        name: cn(widths.large, "text-sm", padding.large.name),
      },
    } as const;

    return map[cellSize];
  }, [cellSize, compactLevel]);

  const compactTier = React.useMemo(
    () => (compactLevel >= 67 ? "ultra" : compactLevel >= 34 ? "compact" : "normal"),
    [compactLevel],
  );

  // In Ultra mode we render vertically. Allow users to flip the vertical direction
  // using the same density slider (higher = alternate direction).
  const ultraWritingMode = React.useMemo<"vertical-rl" | "vertical-lr">(
    () => (compactLevel >= 84 ? "vertical-lr" : "vertical-rl"),
    [compactLevel],
  );

  // Extra ultra-control: beyond a second threshold we flip the text 180°
  // so it reads from the opposite side.
  const ultraTextRotationDeg = React.useMemo<number>(() => (compactLevel >= 92 ? 180 : 0), [compactLevel]);

  const rowHeightClass = React.useMemo(() => {
    const heights =
      rowHeight === "compact"
        ? {
            small: "h-12 min-h-12",
            medium: "h-14 min-h-14",
            large: "h-16 min-h-16",
          }
        : rowHeight === "ultra"
          ? {
              small: "h-10 min-h-10",
              medium: "h-11 min-h-11",
              large: "h-12 min-h-12",
            }
          : {
              small: "h-16 min-h-16",
              medium: "h-20 min-h-20",
              large: "h-24 min-h-24",
            };

    return heights[cellSize];
  }, [cellSize, rowHeight]);

  // For the guest-name row we want the row height selector to act as a *minimum* height,
  // but still allow the cell to grow to fit long names (prevents text spilling past borders).
  const nameRowMinHeightClass = React.useMemo(() => {
    const heights =
      rowHeight === "compact"
        ? {
            small: "min-h-12",
            medium: "min-h-14",
            large: "min-h-16",
          }
        : rowHeight === "ultra"
          ? {
              small: "min-h-10",
              medium: "min-h-11",
              large: "min-h-12",
            }
          : {
              small: "min-h-16",
              medium: "min-h-20",
              large: "min-h-24",
            };

    return heights[cellSize];
  }, [cellSize, rowHeight]);

  const renderTwoLineName = React.useCallback((raw: string) => {
    const name = raw.trim();
    if (!name) return null;

    // Prefer breaking after a meaningful first token (e.g., "AOC", "Spouse of")
    if (name.startsWith("Spouse of ")) {
      const rest = name.slice("Spouse of ".length).trim();
      return (
        <>
          <span className="block">Spouse of</span>
          <span className="block">{rest}</span>
        </>
      );
    }

    const firstSpace = name.indexOf(" ");
    if (firstSpace === -1) return <span className="block">{name}</span>;

    const first = name.slice(0, firstSpace);
    const rest = name.slice(firstSpace + 1);

    return (
      <>
        <span className="block">{first}</span>
        <span className="block">{rest}</span>
      </>
    );
  }, []);


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
  const { serialNumbers, chiefIndex } = React.useMemo(
    () => computeSerialNumbers(guests, arrangement),
    [guests, arrangement],
  );

  const tagNames = React.useMemo(() => {
    if (error) return [] as string[];
    const seen = new Set<string>();
    const names: string[] = [];
    arrangement.forEach((n) => {
      const name = n.trim();
      if (!name) return;
      if (seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
    return names;
  }, [arrangement, error]);

  const referenceOptions = React.useMemo(() => guests.filter((g) => g.id !== editingId), [guests, editingId]);

  const guestByName = React.useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach((g) => map.set(g.name, g));
    return map;
  }, [guests]);

  const handleSaveAsImage = async () => {
    if (!planExportRef.current) return;

    try {
      setExporting(true);
      const dataUrl = await toPng(planExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "hsl(var(--background))",
        skipFonts: true,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(title || "Seating Plan").trim().replace(/\s+/g, " ")}.png`;
      a.click();
    } catch (e) {
      console.error("Failed to export image", e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!planExportRef.current) return;

    const marginPt = pdfMarginPt;

    try {
      setExportingPdf(true);

      // Capture the seating plan as an image, then place it on a landscape PDF page.
      const dataUrl = await toPng(planExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "hsl(var(--background))",
        skipFonts: true,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: pdfPaper,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const props = pdf.getImageProperties(dataUrl);
      const imgW = props.width;
      const imgH = props.height;

      const maxW = pageWidth - marginPt * 2;
      const maxH = pageHeight - marginPt * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);

      const renderW = imgW * scale;
      const renderH = imgH * scale;
      const x = (pageWidth - renderW) / 2;
      const y = (pageHeight - renderH) / 2;

      pdf.addImage(dataUrl, "PNG", x, y, renderW, renderH);

      pdf.save(`${(title || "Seating Plan").trim().replace(/\s+/g, " ")}.pdf`);
    } catch (e) {
      console.error("Failed to export PDF", e);
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrintNameTags = React.useCallback(() => {
    if (tagNames.length === 0) return;

    const fontSize = Number.isFinite(tagsFontSize) ? Math.max(6, Math.min(72, tagsFontSize)) : 16;

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Guest name tags</title>
    <style>
      @page { size: auto; margin: 12mm; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 700;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .toolbar {
        position: sticky;
        top: 0;
        background: white;
        padding: 10px 0;
        margin-bottom: 8mm;
        border-bottom: 1px solid #ddd;
      }
      .toolbar-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .meta { font-weight: 400; font-size: 12px; color: #444; }
      .btn {
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 700;
        font-size: 14px;
        padding: 8px 12px;
        border: 1px solid #000;
        background: #fff;
        cursor: pointer;
      }
      .wrap { display: flex; flex-wrap: wrap; gap: 8mm; align-items: flex-start; }
      .tag {
        border: 1px solid #000;
        padding: 4mm 6mm;
        border-radius: 0;
        font-size: ${fontSize}px;
        line-height: 1.1;
        white-space: nowrap;
      }
      @media print {
        .toolbar { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <div class="toolbar-inner">
        <div>
          <div>Guest name tags</div>
          <div class="meta">Tags: ${tagNames.length} • Font: ${fontSize}px • Tip: use Landscape if needed</div>
        </div>
        <button class="btn" onclick="window.print()">Print</button>
      </div>
    </div>
    <div class="wrap">
      ${tagNames
        .map((n) =>
          String(n)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;"),
        )
        .map((safe) => `<div class="tag">${safe}</div>`)
        .join("\n")}
    </div>
  </body>
</html>`;

    try {
      const win = window.open("about:blank", "_blank");
      if (!win) {
        toast({
          title: "Pop-up blocked",
          description: "Allow pop-ups for this site, then click Print again to open the tags page.",
        });
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    } catch (e) {
      console.error("Failed to open print tags window", e);
      toast({
        title: "Print failed",
        description: "Couldn't open the tags page. Please try again (and ensure pop-ups are allowed).",
      });
    }
  }, [tagNames, tagsFontSize]);

  // Note: Print preview control intentionally omitted from the UI per request.

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
        role === "Regular" || role === "Chief Guest" || (role === "Custom" && form.gradationNo !== undefined)
          ? Number.isFinite(form.gradationNo as number)
            ? Number(form.gradationNo)
            : undefined
          : undefined,
      referenceId: role === "Custom" ? form.referenceId : undefined,
      beforeAfter: role === "Custom" ? form.beforeAfter : undefined,
    };

    if (!cleaned.name) return;
    if (
      (role === "Regular" || role === "Chief Guest") &&
      (cleaned.gradationNo === undefined || Number.isNaN(cleaned.gradationNo))
    )
      return;

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

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 size-4" /> Back to Saved Seat Plans
              </Link>
            </Button>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-6">
        {/* Full-width Guest + Guests list section (no max-width container) */}
        <div className="grid w-full gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit guest" : "Add guest"}</CardTitle>
            <CardDescription>Exactly one “Chief Guest” is required for the plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="name">
                  Name/Appt
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="bdNo">
                    BD No
                  </Label>
                  <Input
                    id="bdNo"
                    value={form.bdNo}
                    onChange={(e) => setForm((p) => ({ ...p, bdNo: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="gradationNo">
                    Gradation No
                  </Label>
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
                    required={form.role === "Regular" || form.role === "Chief Guest"}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
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
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Chief Guest">Chief Guest</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Spouse position</Label>
                  <Select
                    value={form.spousePosition}
                    onValueChange={(v) => setForm((p) => ({ ...p, spousePosition: v as SpousePosition }))}
                  >
                    <SelectTrigger className="h-9">
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

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="dateCommission">
                  Date of Commission (optional)
                </Label>
                <Input
                  id="dateCommission"
                  type="date"
                  value={form.dateCommission ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, dateCommission: e.target.value }))}
                  className="h-9"
                />
              </div>

              {form.role === "Custom" ? (
                <div className="rounded-lg border bg-card p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Place</Label>
                      <Select
                        value={form.beforeAfter ?? "Before"}
                        onValueChange={(v) => setForm((p) => ({ ...p, beforeAfter: v as "Before" | "After" }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Before">Before</SelectItem>
                          <SelectItem value="After">After</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Relative to</Label>
                      <Select
                        value={form.referenceId ?? "none"}
                        onValueChange={(v) => setForm((p) => ({ ...p, referenceId: v === "none" ? undefined : v }))}
                      >
                        <SelectTrigger className="h-9">
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

                  <p className="mt-2 text-xs text-muted-foreground">
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

        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seating plan</CardTitle>
            <CardDescription>Preview generated from your arrangement rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="w-full md:max-w-md space-y-2">
                  <Label htmlFor="planTitle">Enter the title</Label>
                  <Input id="planTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={forceSaveProject} disabled={projectLoading || savingProject}>
                    <Save className="mr-2 size-4" />
                    {saveStatus === "saving" || savingProject
                      ? "Saving…"
                      : saveStatus === "error"
                        ? "Retry save"
                        : "Saved"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSaveAsImage}
                    disabled={!!error || exporting || exportingPdf}
                  >
                    <Download className="mr-2 size-4" /> {exporting ? "Saving..." : "Save as image"}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={tagNames.length === 0}>
                        <Printer className="mr-2 size-4" /> Print tags
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Print guest name tags</DialogTitle>
                        <DialogDescription>
                          Prints all names from the current seating arrangement as Arial Bold tags with a black border.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="tagsFont">Font size (px)</Label>
                          <Input
                            id="tagsFont"
                            type="number"
                            min={6}
                            max={72}
                            value={tagsFontSize}
                            onChange={(e) => setTagsFontSize(Number(e.target.value))}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">
                            Total tags: <span className="tabular-nums">{tagNames.length}</span>
                          </p>
                          <Button onClick={handlePrintNameTags}>
                            <Printer className="mr-2 size-4" /> Print
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <div className="rounded-md border bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm">Compact</Label>
                      <span className="text-xs text-muted-foreground">
                        {compactTier === "normal" ? "Normal" : compactTier === "compact" ? "Compact" : "Ultra"}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[compactLevel]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setCompactLevel(v[0] ?? 0)}
                        aria-label="Compact density"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Select value={rowHeight} onValueChange={(v) => setRowHeight(v as typeof rowHeight)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Row height" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Row: Normal</SelectItem>
                      <SelectItem value="compact">Row: Compact</SelectItem>
                      <SelectItem value="ultra">Row: Ultra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Select value={cellSize} onValueChange={(v) => setCellSize(v as "small" | "medium" | "large")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Cell size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Cell: Small</SelectItem>
                      <SelectItem value="medium">Cell: Medium</SelectItem>
                      <SelectItem value="large">Cell: Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Select value={pdfPaper} onValueChange={(v) => setPdfPaper(v as "a4" | "letter")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 md:justify-self-end">
                  <Button variant="outline" onClick={handleExportPdf} disabled={!!error || exporting || exportingPdf}>
                    <Download className="mr-2 size-4" /> {exportingPdf ? "Exporting..." : "Export PDF"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Export-only render (matches the preview exactly) */}
            <div className="fixed -left-[10000px] top-0 bg-background p-5" aria-hidden="true">
              <div ref={planExportRef} className="inline-block min-w-max">
                <h2 className="mb-4 text-center text-lg font-semibold">{title || "Seating Plan"}</h2>

                {error ? (
                  <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                    {error} (Set one guest to “Chief Guest”.)
                  </div>
                ) : (
                  <table className="border-collapse">
                    <tbody>
                      <tr>
                        {arrangement.map((seatName, i) => {
                          const isSpouseSeat = seatName.startsWith("Spouse of ");
                          if (isSpouseSeat) {
                            return (
                              <td key={i} className={cn("border align-middle", cellSizeClass.cell)}>
                                <div className="flex size-full items-center justify-center" />
                              </td>
                            );
                          }

                          const guest = guestByName.get(seatName);
                          const grad = guest?.gradationNo;

                          return (
                              <td key={i} className={cn("border align-middle", cellSizeClass.cell, rowHeightClass)}>
                              <div className="flex size-full items-center justify-center tabular-nums">
                                {typeof grad === "number" ? grad : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {serialNumbers.map((n, i) => {
                          const isChief = chiefIndex === i;

                          return (
                            <td key={i} className={cn("border align-middle", cellSizeClass.cell, rowHeightClass)}>
                              <div className="flex size-full items-center justify-center tabular-nums">
                                {isChief ? (
                                  <Armchair className="size-4 text-primary" aria-label="Royal chair" />
                                ) : n === 0 ? (
                                  ""
                                ) : (
                                  n
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {arrangement.map((name, i) => (
                          <td
                            key={i}
                            className={cn(
                              "border",
                              compactTier === "ultra"
                                ? "align-top whitespace-nowrap break-normal overflow-visible"
                                : "whitespace-normal break-words",
                              cellSizeClass.name,
                              compactTier === "ultra" ? "h-auto min-h-0" : cn("h-auto", nameRowMinHeightClass),
                            )}
                          >
                            <div
                              className={cn(
                                "text-center",
                                compactTier === "ultra" ? "w-full" : "size-full",
                                compactTier === "ultra"
                                  ? // In ultra mode, avoid vertical centering which creates visible top/bottom gaps.
                                    // Keep it tight and pinned to the start.
                                    "flex items-center justify-start leading-none px-[3px] py-[3px]"
                                  : "flex flex-col items-center justify-center leading-tight",
                              )}
                              style={
                                compactTier === "ultra"
                                  ? ({
                                      writingMode: ultraWritingMode,
                                      textOrientation: "mixed",
                                      transform: ultraTextRotationDeg ? `rotate(${ultraTextRotationDeg}deg)` : undefined,
                                      transformOrigin: "center",
                                    } as React.CSSProperties)
                                  : undefined
                              }
                            >
                              {compactTier === "ultra" ? name : renderTwoLineName(name)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card p-5" aria-label="Seating plan preview">
              <div className="inline-block min-w-max">
                <h2 className="mb-4 text-center text-lg font-semibold">{title || "Seating Plan"}</h2>

                {error ? (
                  <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                    {error} (Set one guest to “Chief Guest”.)
                  </div>
                ) : (
                  <table className="border-collapse">
                    <tbody>
                      <tr>
                        {arrangement.map((seatName, i) => {
                          const isSpouseSeat = seatName.startsWith("Spouse of ");
                          if (isSpouseSeat) {
                            return (
                              <td key={i} className={cn("border align-middle", cellSizeClass.cell)}>
                                <div className="flex size-full items-center justify-center" />
                              </td>
                            );
                          }

                          const guest = guestByName.get(seatName);
                          const grad = guest?.gradationNo;

                          return (
                             <td key={i} className={cn("border align-middle", cellSizeClass.cell, rowHeightClass)}>
                              <div className="flex size-full items-center justify-center tabular-nums">
                                {typeof grad === "number" ? grad : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {serialNumbers.map((n, i) => {
                          const isChief = chiefIndex === i;

                          return (
                            <td key={i} className={cn("border align-middle", cellSizeClass.cell, rowHeightClass)}>
                              <div className="flex size-full items-center justify-center tabular-nums">
                                {isChief ? (
                                  <Armchair className="size-4 text-primary" aria-label="Royal chair" />
                                ) : n === 0 ? (
                                  ""
                                ) : (
                                  n
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {arrangement.map((name, i) => (
                          <td
                            key={i}
                            className={cn(
                              "border",
                              compactTier === "ultra"
                                ? "align-top whitespace-nowrap break-normal overflow-visible"
                                : "whitespace-normal break-words",
                              cellSizeClass.name,
                              compactTier === "ultra" ? "h-auto min-h-0" : cn("h-auto", nameRowMinHeightClass),
                            )}
                          >
                            <div
                              className={cn(
                                "text-center",
                                compactTier === "ultra" ? "w-full" : "size-full",
                                compactTier === "ultra"
                                  ? "flex items-center justify-start leading-none px-[3px] py-[3px]"
                                  : "flex flex-col items-center justify-center leading-tight",
                              )}
                              style={
                                compactTier === "ultra"
                                  ? ({
                                      writingMode: ultraWritingMode,
                                      textOrientation: "mixed",
                                      transform: ultraTextRotationDeg ? `rotate(${ultraTextRotationDeg}deg)` : undefined,
                                      transformOrigin: "center",
                                    } as React.CSSProperties)
                                  : undefined
                              }
                            >
                              {compactTier === "ultra" ? name : renderTwoLineName(name)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Data is automatically saved to the backend and synced across sessions.</p>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
