import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listBillingPlans, updateBillingPlan, listBillingSubscriptions, listBillingEvents } from "@/lib/billing.functions";
import { checkIsSuperAdmin } from "@/lib/tenants.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/billing")({ component: BillingAdminPage });

function BillingAdminPage() {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkIsSuperAdmin);
  const listPlansFn = useServerFn(listBillingPlans);
  const updatePlanFn = useServerFn(updateBillingPlan);
  const listSubsFn = useServerFn(listBillingSubscriptions);
  const listEventsFn = useServerFn(listBillingEvents);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  async function refresh() {
    const [p, s, e] = await Promise.all([listPlansFn(), listSubsFn(), listEventsFn()]);
    setPlans(p.plans as any[]);
    setSubs(s.subscriptions as any[]);
    setEvents(e.events as any[]);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { navigate({ to: "/login", search: { next: undefined } }); return; }
        const { isSuperAdmin } = await checkFn();
        if (!isSuperAdmin) { navigate({ to: "/admin" }); return; }
        setAuthorized(true);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Erro ao carregar cobrança");
        navigate({ to: "/super-admin" });
      }
    })();
  }, []);

  if (authorized === null) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  async function save(plan: any) {
    setSaving(plan.id);
    try {
      await updatePlanFn({
        data: {
          id: plan.id,
          name: plan.name,
          description: plan.description || null,
          monthlyPriceCents: Math.round(Number(plan.monthly_price_cents)),
          annualPriceCents: Math.round(Number(plan.annual_price_cents)),
          customDomain: !!plan.custom_domain,
          active: !!plan.active,
        },
      });
      toast.success("Plano atualizado");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar plano");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div><Button variant="ghost" onClick={() => navigate({ to: "/super-admin" })}>← Super-Admin</Button><h1 className="text-3xl font-serif text-primary mt-2">Cobrança e Licenças</h1></div>
          <div className="text-sm text-muted-foreground">Mercado Pago</div>
        </div>

        <Card><CardHeader><CardTitle>Planos</CardTitle></CardHeader><CardContent className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end border rounded-xl p-4 bg-white">
              <div><Label>Código</Label><Input value={plan.code} disabled /></div>
              <div><Label>Nome</Label><Input value={plan.name} onChange={e => setPlans(x => x.map(p => p.id === plan.id ? {...p,name:e.target.value} : p))} /></div>
              <div><Label>Preço mensal (R$)</Label><Input type="number" min="1" step="0.01" value={Number(plan.monthly_price_cents || 0) / 100} onChange={e => setPlans(x => x.map(p => p.id === plan.id ? {...p,monthly_price_cents: Math.round(Number(e.target.value || 0) * 100)} : p))} /></div>
              <div><Label>Preço anual (R$)</Label><Input type="number" min="1" step="0.01" value={Number(plan.annual_price_cents || 0) / 100} onChange={e => setPlans(x => x.map(p => p.id === plan.id ? {...p,annual_price_cents: Math.round(Number(e.target.value || 0) * 100)} : p))} /></div>\n              <div><Label>Domínio próprio</Label><Input value={plan.custom_domain ? "Sim" : "Não"} disabled /></div>
              <div><Label>Status</Label><Button variant={plan.active ? "default" : "outline"} onClick={() => setPlans(x => x.map(p => p.id === plan.id ? {...p,active:!p.active} : p))}>{plan.active ? "Ativo" : "Inativo"}</Button></div>
              <Button disabled={saving === plan.id || !plan.monthly_price_cents} onClick={() => save(plan)}>{saving === plan.id ? "Salvando..." : "Salvar"}</Button>
            </div>
          ))}
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Assinaturas</CardTitle></CardHeader><CardContent className="overflow-auto">
          <table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Cliente</th><th>Plano</th><th>Status</th><th>Valor</th><th>Próximo período</th></tr></thead>
          <tbody>{subs.map((s) => <tr key={s.id} className="border-b"><td className="p-2">{s.tenants?.business_name || "—"}</td><td>{s.billing_plans?.name || "—"}</td><td>{s.status}</td><td>R$ {(Number(s.amount_cents || 0) / 100).toFixed(2)}</td><td>{s.current_period_end ? new Date(s.current_period_end).toLocaleString("pt-BR") : "—"}</td></tr>)}</tbody></table>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Eventos recentes</CardTitle></CardHeader><CardContent className="overflow-auto">
          <table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Data</th><th>Tipo</th><th>Processado</th><th>Erro</th></tr></thead>
          <tbody>{events.map((e) => <tr key={e.id} className="border-b"><td className="p-2">{new Date(e.created_at).toLocaleString("pt-BR")}</td><td>{e.event_type}</td><td>{e.processed ? "Sim" : "Não"}</td><td>{e.processing_error || "—"}</td></tr>)}</tbody></table>
        </CardContent></Card>
      </div>
    </div>
  );
}
