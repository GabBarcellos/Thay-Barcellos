import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ArrowRight, CalendarDays, Users, WalletCards, Package, Globe2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Plan = {
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number | null;
  annual_price_cents: number | null;
  custom_domain: boolean;
  active: boolean;
};

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos | Thay Nails" },
      { name: "description", content: "Conheça os planos do Thay Nails para organizar agenda, clientes, financeiro e seu negócio." },
    ],
  }),
  component: PlansPage,
});

const features = [
  { icon: CalendarDays, title: "Agenda completa", text: "Organize horários, serviços e agendamentos em um só lugar." },
  { icon: Users, title: "Clientes", text: "Tenha histórico e informações dos seus clientes sempre à mão." },
  { icon: WalletCards, title: "Financeiro", text: "Acompanhe pagamentos, despesas e resultados do negócio." },
  { icon: Package, title: "Estoque", text: "Controle produtos e materiais sem depender de planilhas." },
  { icon: ShieldCheck, title: "Acesso seguro", text: "Cada negócio fica separado e protegido dentro da plataforma." },
];

function money(cents: number | null) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("billing_plans")
        .select("code,name,description,monthly_price_cents,annual_price_cents,custom_domain,active")
        .eq("active", true)
        .order("monthly_price_cents");
      if (!cancelled && !error) setPlans((data || []) as Plan[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(a.monthly_price_cents || 0) - Number(b.monthly_price_cents || 0)),
    [plans],
  );

  return (
    <main className="min-h-screen bg-[#fff7f5] text-[#271515]">
      <section className="px-4 pt-10 pb-8 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#b0486e]">Thay Nails</p>
            <h1 className="mx-auto max-w-3xl font-serif text-4xl leading-tight text-[#4a252c] sm:text-6xl">Mais organização para você cuidar do que realmente importa</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#654f4e] sm:text-lg">Uma plataforma simples para salões e profissionais de beleza cuidarem da agenda, clientes, financeiro e estoque em um só lugar.</p>
          </div>

          <div className="mx-auto mb-8 flex w-fit rounded-full border border-[#b0486e]/15 bg-white p-1 shadow-sm">
            <button className={`rounded-full px-5 py-2 text-sm font-semibold ${billing === "monthly" ? "bg-[#b0486e] text-white" : "text-[#654f4e]"}`} onClick={() => setBilling("monthly")}>Mensal</button>
            <button className={`rounded-full px-5 py-2 text-sm font-semibold ${billing === "annual" ? "bg-[#b0486e] text-white" : "text-[#654f4e]"}`} onClick={() => setBilling("annual")}>Anual</button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {orderedPlans.map((plan) => {
              const price = billing === "annual" ? plan.annual_price_cents : plan.monthly_price_cents;
              const monthlyEquivalent = billing === "annual" ? Number(plan.annual_price_cents || 0) / 12 : Number(plan.monthly_price_cents || 0);
              return (
                <Card key={plan.code} className="overflow-hidden rounded-3xl border-[#b0486e]/10 bg-white shadow-sm">
                  <CardHeader className="p-7 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-serif text-3xl text-[#4a252c]">{plan.name}</CardTitle>
                        <p className="mt-2 text-sm leading-6 text-[#654f4e]">{plan.description}</p>
                      </div>
                      {plan.custom_domain && <span className="inline-flex items-center gap-1 rounded-full bg-[#b0486e]/10 px-3 py-1 text-xs font-semibold text-[#b0486e]"><Globe2 className="h-3.5 w-3.5" /> Domínio próprio</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="p-7 pt-2">
                    <div className="mb-6">
                      <div className="flex items-end gap-2">
                        <span className="font-serif text-5xl text-[#b0486e]">{money(price)}</span>
                        <span className="pb-2 text-sm text-muted-foreground">/{billing === "annual" ? "ano" : "mês"}</span>
                      </div>
                      {billing === "annual" && <p className="mt-1 text-sm text-muted-foreground">equivalente a {money(Math.round(monthlyEquivalent))}/mês</p>}
                    </div>
                    <div className="space-y-3">
                      {features.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3"><div className="mt-0.5 rounded-full bg-[#b0486e]/10 p-1.5 text-[#b0486e]"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#3f292c]">{title}</p><p className="text-xs leading-5 text-muted-foreground">{text}</p></div></div>)}
                      {plan.custom_domain && <div className="flex gap-3"><div className="mt-0.5 rounded-full bg-[#b0486e]/10 p-1.5 text-[#b0486e]"><Check className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#3f292c]">Domínio próprio</p><p className="text-xs leading-5 text-muted-foreground">Use seu próprio endereço para apresentar sua marca.</p></div></div>}
                    </div>
                    <Button asChild className="mt-7 h-11 w-full rounded-xl bg-[#b0486e] hover:bg-[#963d5e]"><Link to="/login">Acessar o sistema<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[#b0486e]/10 bg-white/80 p-6 text-center shadow-sm">
            <h2 className="font-serif text-2xl text-[#4a252c]">Pronto para organizar seu negócio?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">O Standard atende a rotina de gestão. O Custom Domain acrescenta um endereço próprio para reforçar a identidade da sua marca.</p>
            <div className="mt-5"><Button asChild variant="outline" className="rounded-xl"><Link to="/login">Entrar no sistema</Link></Button></div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">Os valores exibidos são os preços comerciais definidos atualmente para a plataforma. Pagamento online ainda não está habilitado nesta etapa.</p>
        </div>
      </section>
    </main>
  );
}
