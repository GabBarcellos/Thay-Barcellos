import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Bug, Sparkles, HelpCircle, Loader2, Star, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  submitSupportRequest,
  listMyResolvedPending,
  rateSupportRequest,
  dismissResolvedNotice,
} from "@/lib/support.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type Kind = "bug" | "request" | "question";
const KINDS: { id: Kind; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "bug", label: "Reportar bug", icon: <Bug className="w-4 h-4" />, color: "border-red-200 bg-red-50 text-red-700" },
  { id: "request", label: "Solicitação", icon: <Sparkles className="w-4 h-4" />, color: "border-purple-200 bg-purple-50 text-purple-700" },
  { id: "question", label: "Dúvida", icon: <HelpCircle className="w-4 h-4" />, color: "border-blue-200 bg-blue-50 text-blue-700" },
];

export function SupportButton() {
  const submitFn = useServerFn(submitSupportRequest);
  const listPendingFn = useServerFn(listMyResolvedPending);
  const rateFn = useServerFn(rateSupportRequest);
  const dismissFn = useServerFn(dismissResolvedNotice);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Poll for resolved-but-unrated tickets so the user gets notified when
  // the super-admin closes one.
  const { data: pending } = useQuery({
    queryKey: ["support", "resolved-pending"],
    queryFn: async () => (await listPendingFn()).requests as any[],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const current = pending?.[0];
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  useEffect(() => { setRating(0); setHoverRating(0); setFeedback(""); }, [current?.id]);

  async function handleRate() {
    if (!current || rating < 1) return;
    setRatingSaving(true);
    try {
      await rateFn({ data: { id: current.id, rating, feedback: feedback.trim() || undefined } });
      toast.success("Obrigada pela sua avaliação!");
      qc.invalidateQueries({ queryKey: ["support", "resolved-pending"] });
    } catch (e: any) { toast.error(e?.message || "Erro ao avaliar"); }
    finally { setRatingSaving(false); }
  }
  async function handleDismiss() {
    if (!current) return;
    try {
      await dismissFn({ data: { id: current.id } });
      qc.invalidateQueries({ queryKey: ["support", "resolved-pending"] });
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submitFn({ data: { kind, subject: subject.trim(), message: message.trim() } });
      toast.success("Mensagem enviada! O suporte vai responder em breve.");
      setOpen(false);
      setSubject(""); setMessage(""); setKind("bug");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar");
    } finally { setSaving(false); }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Reportar bug ou enviar solicitação"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 px-4 py-3 text-sm font-medium hover:scale-[1.03] active:scale-95 transition-transform"
      >
        <LifeBuoy className="w-4 h-4" />
        <span className="hidden sm:inline">Suporte</span>
        {pending && pending.length > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center">
            {pending.length}
          </span>
        )}
      </button>

      <Dialog open={!!current} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
        <DialogContent className="rounded-[2rem] max-w-md">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" /> Seu chamado foi resolvido!
                </DialogTitle>
                <DialogDescription>
                  <b>{current.subject}</b>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {current.admin_reply ? (
                  <div className="rounded-2xl bg-green-50 border border-green-100 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-green-700 font-bold mb-1">Resposta do suporte</p>
                    <p className="text-sm whitespace-pre-wrap text-green-900">{current.admin_reply}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    O suporte marcou seu chamado como resolvido.
                  </p>
                )}

                {current.rating ? (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold mb-1">Sua avaliação</p>
                    <div className="flex">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-5 h-5 ${n <= current.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Como você avalia o atendimento?</Label>
                      <div className="flex items-center gap-1 mt-2">
                        {[1,2,3,4,5].map((n) => (
                          <button
                            key={n} type="button"
                            onMouseEnter={() => setHoverRating(n)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(n)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={`w-8 h-8 ${n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Comentário (opcional)</Label>
                      <Textarea
                        value={feedback} onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Conte como foi sua experiência..."
                        rows={3} maxLength={2000}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                {current.rating ? (
                  <Button type="button" onClick={handleDismiss} className="rounded-full">Ok, entendi</Button>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={handleDismiss}>Avaliar depois</Button>
                    <Button type="button" onClick={handleRate} disabled={ratingSaving || rating < 1} className="rounded-full gap-2">
                      {ratingSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Enviar avaliação
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <LifeBuoy className="w-5 h-5" /> Falar com o suporte
              </DialogTitle>
              <DialogDescription>
                Conte o que aconteceu ou o que você gostaria. Sua mensagem vai direto para o administrador.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map((k) => (
                  <button
                    type="button"
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-xs font-medium transition-all ${
                      kind === k.id ? `${k.color} ring-2 ring-offset-1 ring-primary/40` : "border-gray-200 bg-white text-muted-foreground hover:bg-gray-50"
                    }`}
                  >
                    {k.icon}<span>{k.label}</span>
                  </button>
                ))}
              </div>
              <div>
                <Label>Assunto</Label>
                <Input
                  value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Não consigo salvar o agendamento"
                  required maxLength={200}
                />
              </div>
              <div>
                <Label>Detalhes</Label>
                <Textarea
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva com o máximo de detalhes para acelerar o atendimento..."
                  required maxLength={4000} rows={5}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/4000</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !subject.trim() || !message.trim()} className="rounded-full bg-primary gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}