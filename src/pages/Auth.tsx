import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users } from "lucide-react";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);

function parseHashParams(hash: string): Record<string, string> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const resetSchema = useMemo(
    () =>
      z
        .object({
          newPassword: passwordSchema,
          confirmNewPassword: z.string(),
        })
        .refine((v) => v.newPassword === v.confirmNewPassword, {
          message: "Passwords do not match",
          path: ["confirmNewPassword"],
        }),
    [],
  );

  // If user is already signed in, take them home.
  useEffect(() => {
    let isMounted = true;

    const goHome = () => {
      // Defer navigation to avoid "The operation is insecure" errors in some embedded contexts.
      setTimeout(() => {
        if (isMounted) navigate("/", { replace: true });
      }, 0);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goHome();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goHome();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Handle password recovery redirects.
  useEffect(() => {
    const params = parseHashParams(location.hash);
    const type = params.type;
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (type === "recovery" && access_token && refresh_token) {
      setResetMode(true);

      // Establish a session so updateUser({ password }) works.
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) toast.error(error.message);
        });

      // Clean URL hash (avoids re-processing on refresh and hides tokens from casual copy/paste).
      setTimeout(() => {
        window.history.replaceState({}, document.title, location.pathname + location.search);
      }, 0);
    }
  }, [location.hash, location.pathname, location.search]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEmail = emailSchema.safeParse(email);
    const parsedPassword = passwordSchema.safeParse(password);

    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    if (!parsedPassword.success) {
      toast.error(parsedPassword.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email: parsedEmail.data,
      password: parsedPassword.data,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now log in.");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEmail = emailSchema.safeParse(email);
    const parsedPassword = passwordSchema.safeParse(password);

    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    if (!parsedPassword.success) {
      toast.error(parsedPassword.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: parsedEmail.data,
      password: parsedPassword.data,
    });

    if (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEmail = emailSchema.safeParse(forgotEmail);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setForgotSending(true);

    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, { redirectTo });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent. Check your inbox.");
      setForgotOpen(false);
    }

    setForgotSending(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = resetSchema.safeParse({ newPassword, confirmNewPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setResetSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (error) {
      toast.error(error.message);
      setResetSaving(false);
      return;
    }

    toast.success("Password updated. You’re signed in.");
    setResetSaving(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <CardTitle>Seating Plan Builder</CardTitle>
              <CardDescription>Sign in to save your projects</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {resetMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Set a new password</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your new password to finish resetting your account.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={resetSaving}>
                {resetSaving ? "Updating..." : "Update password"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setResetMode(false);
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
              >
                Back to sign in
              </Button>
            </form>
          ) : (
            <>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>

                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotOpen(true);
                      }}
                    >
                      Forgot password?
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset your password</DialogTitle>
                    <DialogDescription>
                      We’ll email you a secure link to set a new password.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSendResetEmail} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={forgotSending}>
                        {forgotSending ? "Sending..." : "Send reset link"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
