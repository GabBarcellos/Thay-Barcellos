import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas super-admin.");
}

export const listBillingPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin.from("billing_plans").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return { plans: data ?? [] };
  });

export const updateBillingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(100),
    description: z.string().max(500).nullable(),
    monthlyPriceCents: z.number().int().min(1).max(100000000),
    annualPriceCents: z.number().int().min(1).max(100000000),
    customDomain: z.boolean(),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("billing_plans").update({
      name: data.name,
      description: data.description,
      monthly_price_cents: data.monthlyPriceCents,
      annual_price_cents: data.annualPriceCents,
      custom_domain: data.customDomain,
      active: data.active,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBillingSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, tenant_id, plan_id, provider, provider_subscription_id, status, payer_email, amount_cents, currency, checkout_url, current_period_end, cancel_at_period_end, created_at, updated_at, tenants(business_name,username), billing_plans(code,name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { subscriptions: data ?? [] };
  });

export const listBillingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin.from("billing_events")
      .select("id, provider, event_type, provider_event_id, provider_resource_id, processed, processing_error, created_at, processed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });
