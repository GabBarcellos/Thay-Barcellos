import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MP_API = "https://api.mercadopago.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function handle(request: Request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Não autenticado." }, 401);

  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  const publicUrl = process.env["PUBLIC_APP_URL"];
  if (!mpToken || !publicUrl) return json({ error: "Billing ainda não está configurado no ambiente." }, 503);

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);

  const body = await request.json().catch(() => ({}));
  const planCode = String(body?.planCode || "").trim();
  if (!planCode) return json({ error: "Informe o plano." }, 400);

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, business_name, active, deleted_at")
    .eq("owner_user_id", authData.user.id)
    .maybeSingle();

  if (tenantError || !tenant || tenant.deleted_at || tenant.active === false) {
    return json({ error: "Conta não disponível para assinatura." }, 403);
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("billing_plans")
    .select("id, code, name, monthly_price_cents, currency, active")
    .eq("code", planCode)
    .eq("active", true)
    .maybeSingle();

  if (planError || !plan) return json({ error: "Plano não encontrado ou inativo." }, 404);
  if (!plan.monthly_price_cents || plan.monthly_price_cents <= 0) {
    return json({ error: "O valor mensal deste plano ainda não foi configurado." }, 409);
  }

  const externalReference = "tenant:" + tenant.id + ":plan:" + plan.code + ":" + crypto.randomUUID();

  const { data: localSub, error: insertError } = await supabaseAdmin
    .from("billing_subscriptions")
    .insert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      provider: "mercadopago",
      status: "pending",
      payer_email: authData.user.email || null,
      amount_cents: plan.monthly_price_cents,
      currency: plan.currency || "BRL",
      metadata: { external_reference: externalReference },
    })
    .select("id")
    .single();

  if (insertError || !localSub) return json({ error: "Não foi possível iniciar a assinatura." }, 500);

  const response = await fetch(MP_API + "/preapproval", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + mpToken },
    body: JSON.stringify({
      reason: "GB Technology - " + plan.name,
      external_reference: externalReference,
      payer_email: authData.user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.monthly_price_cents) / 100,
        currency_id: plan.currency || "BRL",
      },
      back_url: publicUrl.replace(/\/$/, "") + "/minha-conta",
    }),
  });

  const mpBody = await response.json().catch(() => ({}));
  if (!response.ok || !mpBody?.id) {
    await supabaseAdmin.from("billing_subscriptions").delete().eq("id", localSub.id);
    console.error("[billing] Mercado Pago error", response.status, mpBody);
    return json({ error: "O gateway não conseguiu criar o checkout." }, 502);
  }

  await supabaseAdmin.from("billing_subscriptions").update({
    provider_subscription_id: String(mpBody.id),
    checkout_url: mpBody.init_point || null,
    metadata: { external_reference: externalReference, mp_response: mpBody },
    updated_at: new Date().toISOString(),
  }).eq("id", localSub.id);

  await supabaseAdmin.from("tenants").update({
    plan_code: plan.code,
    license_status: "pending",
    billing_email: authData.user.email || null,
    mp_preapproval_id: String(mpBody.id),
    updated_at: new Date().toISOString(),
  }).eq("id", tenant.id);

  return json({
    ok: true,
    subscriptionId: localSub.id,
    providerSubscriptionId: String(mpBody.id),
    checkoutUrl: mpBody.init_point || null,
  });
}

export const Route = createFileRoute("/api/billing/checkout")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
