import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getAuthEmailByUsername, requestPasswordReset } from "@/lib/tenants.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NailPolishLoader } from "@/components/ui/nail-polish-loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    // A sessão persistida existe apenas no navegador, especialmente no app instalado.
    if (typeof window === "undefined") return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) throw redirect({ to: "/admin" });

    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/admin" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const lookupEmailFn = useServerFn(getAuthEmailByUsername);
  const requestResetFn = useServerFn(requestPasswordReset);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          navigate({ to: "/admin" });
          return;
        }
      } finally {
        if (active) setIsCheckingAutoLogin(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate({ to: "/admin" });
      }
    });

    restoreSession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    let email = `${username.trim().toLowerCase()}@thaynails.local`;
    try {
      const res = await lookupEmailFn({ data: { username: username.trim().toLowerCase() } });
      if (res?.email) email = res.email;
    } catch {
      // fallback to synthetic email
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Usuário ou senha incorretos");
      return;
    }
    // O Supabase mantém a sessão com segurança neste dispositivo e a renova
    // automaticamente. Não armazenamos a senha no navegador.
    localStorage.removeItem("thaynails_remember_v2");
    sessionStorage.removeItem("thaynails_logged_out");
    toast.success("Bem-vinda!");
    navigate({ to: "/admin" });
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      toast.error("Informe seu usuário");
      return;
    }
    setForgotLoading(true);
    try {
      await requestResetFn({
        data: {
          username: forgotUsername.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      toast.success("Se houver um e-mail cadastrado, enviamos o link de recuperação.");
      setForgotOpen(false);
      setForgotUsername("");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar o e-mail de recuperação");
    } finally {
      setForgotLoading(false);
    }
  }



  if (isCheckingAutoLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <NailPolishLoader size={56} />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Acessando o sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-8">
      <Card className="w-full max-w-md border-gray-100 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto flex items-center justify-center">
            <NailPolishLoader size={56} />
          </div>
          <CardTitle className="font-serif text-3xl text-primary">Agendamento Online</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Bem-vinda de volta! 💅✨
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Usuário</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Manter conectado neste dispositivo
                </label>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Usuário</label>
              <Input
                type="text"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                placeholder="seu usuário"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Enviaremos o link de recuperação para o e-mail cadastrado nesta conta.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={forgotLoading} className="w-full">
                {forgotLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : "Enviar link de recuperação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}