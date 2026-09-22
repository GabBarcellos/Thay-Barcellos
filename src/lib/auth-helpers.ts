import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current authenticated user id. Throws if no session.
 * Use inside admin pages where the user is guaranteed to be logged in.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/**
 * Resolve which tenant (owner user id) the public booking page should target.
 * Reads `?t=<slug>` from the URL. 
 */
export async function resolvePublicTenant(): Promise<{ ownerId: string; businessName: string; slug: string } | null> {
  let slug: string | null = null;
  if (typeof window !== "undefined") {
    slug = new URLSearchParams(window.location.search).get("t");
  }

  // Se não houver slug na URL, usamos o slug padrão
  if (!slug) {
    slug = "thaynabarcellosnails";
  }

  const { data } = await supabase
    .from("tenants")
    .select("owner_user_id, business_name, slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (data) {
    return { 
      ownerId: data.owner_user_id, 
      businessName: data.business_name, 
      slug: data.slug 
    };
  }

  return null;
}