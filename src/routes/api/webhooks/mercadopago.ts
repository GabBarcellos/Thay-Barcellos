import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MP_API = "https://api.mercadopago.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function parseSignature(value: string | null) {
  const result: Record<string, string> = {};
  for (const part of (value || "").split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length) result[key] = rest.join("=");
  }
  return result;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handle(request: Request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!secret || !accessToken) return json({ error: "Webhook não configurado." }, 503);

  const payload = await request.json().catch(() => ({}));
  const type = String(payload?.type || payload?.topic || "");
  const resourceId = String(payload?.data?.id || payload?.id || "");
  if (!type || !resourceId) return json({ ok: true });

  const sig = parseSignature(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id") || "";
  const ts = sig.ts || "";
  const v1 = sig.v1 || "";
  if (!ts || !v1 || !requestId) return json({ error: "Assinatura ausente." }, 401);
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return json({ error: "Assinatura expirada." }, 401);
  }

  const manifest = "id:" + resourceId.toLowerCase() + ";request-id:" + requestId + ";ts:" + ts + ";";
  const expected = await hmac(secret, manifest);
  if (!safeEqual(expected, v1)) return json({ error: "Assinatura inválida." }, 401);

  const providerEventId = type + ":" + resourceId;
  const { data: existing } = await supabaseAdmin.from("billing_events")
    .select("id, processed")
    .eq("provider", "mercadopago")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();
  if (existing?.processed) return json({ ok: true, duplicate: true });

  const { data: event, error: eventError } = await supabaseAdmin.from("billing_events")
    .upsert({
      provider: "mercadopago",
      event_type: type,
      provider_event_id: providerEventId,
      provider_resource_id: resourceId,
      payload,
      processed: false,
    }, { onConflict: "provider,provider_event_id" })
    .select("id")
    .single();

  if (eventError || !event) return json({ error: "Não foi possível registrar o evento." }, 500);

  try {
    let subscriptionId: string | null = null;
    let resource: any = null;

    if (type === "subscription_preapproval") {
      const response = await fetch(MP_API + "/preapproval/" + encodeURIComponent(resourceId), {
        headers: { authorization: "Bearer " + accessToken },
      });
      resource = await response.json();
      if (!response.ok) throw new Error("Falha ao consultar assinatura no Mercado Pago.");
      subscriptionId = String(resource.id || resourceId);
    } else if (type === "subscription_authorized_payment") {
      const response = await fetch(MP_API + "/authorized_payments/" + encodeURIComponent(resourceId), {
        headers: { authorization: "Bearer " + accessToken },
      });
      resource = await response.json();
      if (!response.ok) throw new Error("Falha ao consultar cobrança no Mercado Pago.");
      subscriptionId = resource.preapproval_id ? String(resource.preapproval_id) : null;
    } else {
      await supabaseAdmin.from("billing_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
      return json({ ok: true, ignored: true });
    }

    if (!subscriptionId) throw new Error("Evento sem assinatura.");

    const { data: localSub } = await supabaseAdmin.from("billing_subscriptions")
      .select("id, tenant_id")
      .eq("provider_subscription_id", subscriptionId)
      .maybeSingle();

    if (!localSub) {
      await supabaseAdmin.from("billing_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
      return json({ ok: true, ignored: true });
    }

    if (type === "subscription_preapproval") {
      const status = String(resource.status || "pending");
      const licenseStatus = status === "authorized" ? "active" : status === "paused" ? "paused" : status === "cancelled" ? "canceled" : "pending";

      await supabaseAdmin.from("billing_subscriptions").update({
        status,
        current_period_end: resource.next_payment_date || null,
        metadata: resource,
        updated_at: new Date().toISOString(),
      }).eq("id", localSub.id);

      await supabaseAdmin.from("tenants").update({
        license_status: licenseStatus,
        license_valid_until: resource.next_payment_date || null,
        mp_preapproval_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq("id", localSub.tenant_id);
    } else {
      const paymentStatus = String(resource.status || "unknown");
      await supabaseAdmin.from("billing_subscriptions").update({
        status: paymentStatus === "approved" ? "authorized" : "payment_" + paymentStatus,
        metadata: resource,
        updated_at: new Date().toISOString(),
      }).eq("id", localSub.id);

      if (paymentStatus === "approved") {
        await supabaseAdmin.from("tenants").update({
          license_status: "active",
          license_valid_until: resource.date_approved || null,
          updated_at: new Date().toISOString(),
        }).eq("id", localSub.tenant_id);
      }
    }

    await supabaseAdmin.from("billing_events").update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: null,
    }).eq("id", event.id);

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    await supabaseAdmin.from("billing_events").update({ processing_error: message.slice(0, 4000) }).eq("id", event.id);
    console.error("[billing-webhook] processing failed", message);
    return json({ error: "Falha ao processar webhook." }, 500);
  }
}

export const Route = createFileRoute("/api/webhooks/mercadopago")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
