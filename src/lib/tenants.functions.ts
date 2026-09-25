import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas super-admin.");
}

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, business_name, active, owner_user_id, created_at, username, recovery_email, expires_at, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Attach hidden_menu_items per tenant (module permissions)
    const ownerIds = (data ?? []).map((t) => t.owner_user_id);
    let hiddenMap: Record<string, string[]> = {};
    if (ownerIds.length > 0) {
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("owner_id, value")
        .eq("key", "hidden_menu_items")
        .in("owner_id", ownerIds);
      for (const s of settings ?? []) {
        try { hiddenMap[s.owner_id] = JSON.parse(s.value || "[]"); } catch { hiddenMap[s.owner_id] = []; }
      }
    }

    // Mark which tenants are super_admins (so UI can avoid restricting them)
    let superAdminIds: Set<string> = new Set();
    if (ownerIds.length > 0) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin")
        .in("user_id", ownerIds);
      superAdminIds = new Set((roles ?? []).map((r: any) => r.user_id));
    }

    const tenants = (data ?? []).map((t) => ({
      ...t,
      hidden_menu_items: hiddenMap[t.owner_user_id] ?? [],
      is_super_admin: superAdminIds.has(t.owner_user_id),
    }));
    return { tenants };
  });

export const listDeletedTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, business_name, active, owner_user_id, created_at, username, recovery_email, expires_at, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tenants: data ?? [] };
  });

export const restoreTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ deleted_at: null, active: true })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _"),
  password: z.string().min(6).max(72),
  businessName: z.string().min(2).max(100),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e -"),
  recoveryEmail: z.string().email().optional().or(z.literal("")),
});

export const createTenantAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);

    const recovery = data.recoveryEmail?.trim() || null;
    const email = recovery || `${data.username}@thaynails.local`;

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar usuário");

    const newUserId = created.user.id;

    const { error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({ 
        owner_user_id: newUserId, 
        slug: data.slug, 
        business_name: data.businessName,
        username: data.username,
        recovery_email: recovery,
      });
    if (tErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error("Falha ao criar negócio: " + tErr.message);
    }

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "tenant" });
    if (rErr) throw new Error(rErr.message);

    // Professionals now start with a clean workspace as requested.
    // Default settings are handled by the database trigger (seed_tenant_defaults).

    return { ok: true, userId: newUserId };
  });

const toggleSchema = z.object({ tenantId: z.string().uuid(), active: z.boolean() });

export const setTenantActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ active: data.active })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const expirySchema = z.object({
  tenantId: z.string().uuid(),
  expiresAt: z.string().nullable(), // ISO date string or null to clear
});

export const setTenantExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => expirySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ expires_at: data.expiresAt })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const resetSchema = z.object({ userId: z.string().uuid(), password: z.string().min(6).max(72) });

export const resetTenantPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    
    // Update auth user
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);


    return { ok: true };
  });

const updateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  businessName: z.string().min(2).max(100),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e -"),
  username: z.string().min(3).max(40).regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _"),
  recoveryEmail: z.string().email().optional().or(z.literal("")),
});

export const updateTenantInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateTenantSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_user_id")
      .eq("id", data.tenantId)
      .single();

    if (!tenant) throw new Error("Negócio não encontrado");

    // Auth user email = recovery email when set, else synthetic email derived from username
    const recovery = data.recoveryEmail?.trim() || null;
    const newEmail = recovery || `${data.username}@thaynails.local`;
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(tenant.owner_user_id, {
      email: newEmail,
      email_confirm: true,
    });
    if (authErr) throw new Error("Erro ao atualizar login: " + authErr.message);

    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ 
        business_name: data.businessName, 
        slug: data.slug,
        username: data.username,
        recovery_email: recovery,
      })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

const deleteSchema = z.object({ tenantId: z.string().uuid(), userId: z.string().uuid() });

// Soft-delete: move tenant to trash, suspend account so it can't log in.
// The auth user is preserved so the tenant can be restored later.
export const deleteTenantAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Hard delete from trash: removes auth user (cascades to tenant + user_roles).
export const permanentlyDeleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin")
      .maybeSingle();
    return { isSuperAdmin: !!data };
  });

// Update which modules a tenant can see in the sidebar
const permsSchema = z.object({
  tenantId: z.string().uuid(),
  hiddenItems: z.array(z.string().min(1).max(40)).max(40),
});
export const setTenantPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => permsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_user_id")
      .eq("id", data.tenantId)
      .single();
    if (!tenant) throw new Error("Negócio não encontrado");
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert(
        {
          owner_id: tenant.owner_user_id,
          key: "hidden_menu_items",
          value: JSON.stringify(data.hiddenItems),
          description: "Itens ocultos do menu (gerenciado pelo super-admin)",
        },
        { onConflict: "owner_id,key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// PUBLIC: translate a username to its current auth email (so the login form
// can sign in even after the owner changes her e-mail).
export const getAuthEmailByUsername = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_user_id, active, expires_at, username, deleted_at")
      .eq("username", username)
      .maybeSingle();
    if (!tenant) return { email: `${username}@thaynails.local` };
    // Super-admins are never suspended/expired through this gate
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", tenant.owner_user_id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) {
      if (tenant.deleted_at) {
        throw new Error("Conta excluída. Entre em contato com o administrador.");
      }
      if (tenant.active === false) {
        throw new Error("Conta suspensa. Entre em contato com o administrador.");
      }
      if (tenant.expires_at && new Date(tenant.expires_at).getTime() < Date.now()) {
        throw new Error("Seu plano expirou. Entre em contato com o administrador para renovar.");
      }
    }
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_user_id);
    const email = userRes?.user?.email || `${username}@thaynails.local`;
    return { email };
  });

// PUBLIC: send a password-reset e-mail using the recovery_email registered
// for the given username.
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      username: z.string().min(1).max(60),
      redirectTo: z.string().url(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_user_id, recovery_email")
      .eq("username", username)
      .maybeSingle();
    if (!tenant) {
      // Don't reveal whether the user exists.
      return { ok: true };
    }
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_user_id);
    const authEmail = userRes?.user?.email;
    const target = tenant.recovery_email || authEmail;
    if (!target || target.endsWith("@thaynails.local")) {
      throw new Error("Esta conta ainda não tem um e-mail de recuperação cadastrado.");
    }
    // Ensure auth user email matches recovery email so Supabase delivers to it.
    if (authEmail !== target) {
      await supabaseAdmin.auth.admin.updateUserById(tenant.owner_user_id, {
        email: target,
        email_confirm: true,
      });
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(target, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTenantData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);

    // Precise list of tables to clear based on the user's owner_id
    // This ensures that all related data is removed for a "fresh start"
    const tables = ["appointments", "inventory", "expenses", "payments"] as const;

    for (const table of tables) {
      // Direct delete to ensure all records associated with this owner_id are removed
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("owner_id", data.userId);
      
      if (error) {
        console.error(`Error clearing table ${table}:`, error);
        throw new Error(`Erro ao limpar tabela ${table}: ${error.message}`);
      }
    }

    // Reports are calculated based on these tables, so clearing them effectively resets reports as well.
    // Some components might have hardcoded static data for demonstration which might still show up.

    return { ok: true };
  });

// ===== WhatsApp Backgrounds management (super-admin) =====

export const listTenantBackgrounds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("whatsapp_backgrounds")
      .select("id, url, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { backgrounds: rows ?? [] };
  });

export const addTenantBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    url: z.string().url().max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("whatsapp_backgrounds")
      .insert({ user_id: data.userId, url: data.url });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenantBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("whatsapp_backgrounds")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
