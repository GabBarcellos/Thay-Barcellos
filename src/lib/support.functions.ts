import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  kind: z.enum(["bug", "request", "question"]),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
});

export const submitSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_requests")
      .insert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSupportRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!isAdmin) throw new Error("Acesso negado");

    const { data: reqs, error } = await supabaseAdmin
      .from("support_requests")
      .select("id, user_id, kind, subject, message, status, resolved_at, created_at, admin_reply, rating, rating_feedback, rated_at, acknowledged_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
    let tenantMap: Record<string, { business_name: string; username: string | null }> = {};
    if (ids.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("owner_user_id, business_name, username")
        .in("owner_user_id", ids);
      for (const t of tenants ?? []) {
        tenantMap[t.owner_user_id] = { business_name: t.business_name, username: t.username };
      }
    }
    return {
      requests: (reqs ?? []).map((r) => ({
        ...r,
        business_name: tenantMap[r.user_id]?.business_name ?? "—",
        username: tenantMap[r.user_id]?.username ?? null,
      })),
    };
  });

export const setSupportRequestResolved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      resolved: z.boolean(),
      reply: z.string().trim().max(4000).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!isAdmin) throw new Error("Acesso negado");
    const { error } = await context.supabase
      .from("support_requests")
      .update({
        status: data.resolved ? "resolved" : "open",
        resolved_at: data.resolved ? new Date().toISOString() : null,
        admin_reply: data.reply?.length ? data.reply : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Returns resolved requests owned by the current user that still need attention:
// either not yet acknowledged, or not yet rated. Used by the client to show
// a notification/rating dialog after the super-admin closes a ticket.
export const listMyResolvedPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_requests")
      .select("id, kind, subject, message, admin_reply, resolved_at, rating, acknowledged_at")
      .eq("user_id", context.userId)
      .eq("status", "resolved")
      .is("acknowledged_at", null)
      .order("resolved_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

// Super-admin: re-send the "resolved" notification for a ticket that was
// already closed (and possibly already acknowledged/rated). Clears
// acknowledged_at so the user's app shows the resolved-notice dialog again.
export const resendResolvedNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!isAdmin) throw new Error("Acesso negado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("support_requests")
      .update({ acknowledged_at: null })
      .eq("id", data.id)
      .eq("status", "resolved");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rateSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      feedback: z.string().trim().max(2000).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const nowIso = new Date().toISOString();
    const { error } = await context.supabase
      .from("support_requests")
      .update({
        rating: data.rating,
        rating_feedback: data.feedback?.length ? data.feedback : null,
        rated_at: nowIso,
        acknowledged_at: nowIso,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dismissResolvedNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_requests")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });