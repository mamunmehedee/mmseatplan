import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: Props) {
  const [checking, setChecking] = React.useState(true);
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSignedIn(Boolean(data.session));
      })
      .finally(() => {
        if (!mounted) return;
        setChecking(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Loading…</CardTitle>
              <CardDescription>Preparing your workspace.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

function AuthScreen() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>Your guests and projects are private to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <AuthForm
                  email={email}
                  password={password}
                  busy={busy}
                  error={error}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSubmit={onSubmit}
                  submitLabel="Sign in"
                />
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <AuthForm
                  email={email}
                  password={password}
                  busy={busy}
                  error={error}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSubmit={onSubmit}
                  submitLabel="Create account"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthForm(props: {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}) {
  return (
    <form className="space-y-4" onSubmit={props.onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={props.email}
          onChange={(e) => props.onEmailChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={props.password}
          onChange={(e) => props.onPasswordChange(e.target.value)}
          required
        />
      </div>

      {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}

      <Button type="submit" className="w-full" disabled={props.busy}>
        {props.submitLabel}
      </Button>
    </form>
  );
}
