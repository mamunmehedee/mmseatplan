import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email?: string | null;
};

export default function ProfileDialog({ open, onOpenChange, userId, email }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;
        if (error) throw error;
        setDisplayName(data?.display_name ?? "");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load profile");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [open, userId]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            display_name: displayName.trim() || null,
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSave}>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium">{email ?? "—"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="(optional)"
              disabled={loading}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
