import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAppointmentErrorMessage } from "@/lib/utils";

// Keys for React Query
export const QUERY_KEYS = {
  appointments: (range?: number) => ["appointments", range],
  services: (ownerId?: string) => ["services", ownerId],
  inventory: (ownerId?: string) => ["inventory", ownerId],
  payments: (ownerId?: string) => ["payments", ownerId],
  expenses: (ownerId?: string) => ["expenses", ownerId],
  tenant: (slug?: string) => ["tenant", slug],
  settings: (ownerId?: string) => ["settings", ownerId],
  whatsappBackgrounds: (ownerId?: string) => ["whatsapp-backgrounds", ownerId],
  clients: (ownerId?: string) => ["clients", ownerId],
};

// --- QUERIES ---

export function useAppointments(range?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.appointments(range),
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('id, client_name, phone, appointment_time, status, service_id, price, custom_price, is_exchange, observation, services(name, id, duration)')
        .order('appointment_time', { ascending: false });

      if (range !== undefined && range !== 0) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (range === -1) { // Today
          const endOfToday = startOfDay + 24 * 60 * 60 * 1000;
          query = query.gte('appointment_time', new Date(startOfDay).toISOString())
                       .lt('appointment_time', new Date(endOfToday).toISOString());
        } else if (range === 30) { // Last 30 days
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          query = query.gte('appointment_time', new Date(thirtyDaysAgo).toISOString());
        } else {
          const limit = now.getTime() + range * 24 * 60 * 60 * 1000;
          query = query.gte('appointment_time', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
                       .lte('appointment_time', new Date(limit).toISOString());
        }
      } else {
        // By default, only fetch last 90 days to avoid huge payloads
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        query = query.gte('appointment_time', ninetyDaysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useServices(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.services(ownerId),
    queryFn: async () => {
      let query = supabase.from('services').select('*').order('created_at', { ascending: true });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId || ownerId === undefined,
    staleTime: 1000 * 60 * 10, // 10 minutes (services don't change often)
  });
}

export function usePayments(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.payments(ownerId),
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useExpenses(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.expenses(ownerId),
    queryFn: async () => {
      let query = supabase.from('expenses').select('*').order('due_date', { ascending: false });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInventory(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.inventory(ownerId),
    queryFn: async () => {
      let query = supabase.from('inventory').select('*').order('stock_quantity', { ascending: true });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTenant(slug?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tenant(slug),
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("owner_user_id, business_name, slug, active, username, display_name")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 60, // 1 hour (tenant info is very stable)
  });
}

export function useUserIdentity() {
  return useQuery({
    queryKey: ["user-identity"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      
      const [{ data: userRole }, { data: tenant }, { data: salonSetting }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "super_admin").maybeSingle(),
        supabase.from("tenants").select("business_name, slug, active, username, display_name").eq("owner_user_id", u.user.id).maybeSingle(),
        supabase.from('settings').select('value').eq('owner_id', u.user.id).eq('key', 'salon_name').maybeSingle()
      ]);

      return {
        user: u.user,
        role: userRole?.role,
        tenant,
        salonSetting
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useSettings(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.settings(ownerId),
    queryFn: async () => {
      let query = supabase.from('settings').select('*');
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// --- MUTATIONS ---

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointment: any) => {
      // O cadastro/atualização da cliente é feito automaticamente no banco
      // (pelo telefone, ignorando formatação), evitando duplicidade e erros.


      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: any) => {
      toast.error(getAppointmentErrorMessage(error));
    }
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      if (updates.client_name) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: existingClients } = await supabase
            .from('clients')
            .select('id')
            .eq('owner_id', userData.user.id)
            .eq('name', updates.client_name.trim())
            .maybeSingle();

          if (!existingClients) {
            await supabase.from('clients').insert([{
              name: updates.client_name.trim(),
              phone: updates.phone || '',
              owner_id: userData.user.id
            }]);
          }
        }
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Agendamento atualizado");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento excluído");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    }
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: any) => {
      const { data, error } = await supabase
        .from('services')
        .insert([service])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Novo serviço adicionado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar: " + error.message);
    }
  });
}

export function usePendingAppointments() {
  return useQuery({
    queryKey: ["pending-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, price, appointment_time, status, phone, services(name)")
        .neq("status", "Concluído")
        .order("appointment_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await supabase
        .from("payments")
        .insert([payment])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-appointments"] });
      toast.success("Pagamento registrado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar pagamento: " + error.message);
    }
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço removido!");
    },
    onError: (error: any) => {
      toast.error("Não foi possível remover. Pode haver agendamentos vinculados.");
    }
  });
}

export function useClients(ownerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.clients(ownerId),
    queryFn: async () => {
      let query = supabase.from('clients').select('*').order('name', { ascending: true });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluída com sucesso!");
    },
    onError: () => {
      toast.error("Não foi possível excluir a cliente. Tente novamente.");
    }
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });
}
