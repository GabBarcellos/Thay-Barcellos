export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_time: string
          booking_source: string
          client_id: string | null
          client_name: string
          created_at: string | null
          custom_price: number | null
          discount: number | null
          id: string
          is_exchange: boolean | null
          observation: string | null
          owner_id: string
          phone: string | null
          price: number
          service_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_time: string
          booking_source?: string
          client_id?: string | null
          client_name: string
          created_at?: string | null
          custom_price?: number | null
          discount?: number | null
          id?: string
          is_exchange?: boolean | null
          observation?: string | null
          owner_id: string
          phone?: string | null
          price?: number
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_time?: string
          booking_source?: string
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          custom_price?: number | null
          discount?: number | null
          id?: string
          is_exchange?: boolean | null
          observation?: string | null
          owner_id?: string
          phone?: string | null
          price?: number
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          due_date: string
          id: string
          owner_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          owner_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          item_name: string
          owner_id: string
          status: string
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name: string
          owner_id: string
          status?: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name?: string
          owner_id?: string
          status?: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string | null
          owner_id: string
          payer_name: string
          payment_date: string
          promise_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string | null
          owner_id: string
          payer_name: string
          payment_date: string
          promise_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string | null
          owner_id?: string
          payer_name?: string
          payment_date?: string
          promise_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_booking_events: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_booking_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      push_reminder_log: {
        Row: {
          id: string
          owner_id: string
          reminder_key: string
          sent_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          reminder_key: string
          sent_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          reminder_key?: string
          sent_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          owner_id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          owner_id: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          owner_id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          name: string
          owner_id: string
          price: number
          show_on_homepage: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          name: string
          owner_id: string
          price?: number
          show_on_homepage?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string
          price?: number
          show_on_homepage?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          owner_id: string
          updated_at: string | null
          value: string | null
          value_json: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          owner_id: string
          updated_at?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          owner_id?: string
          updated_at?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          acknowledged_at: string | null
          admin_reply: string | null
          created_at: string
          id: string
          kind: string
          message: string
          rated_at: string | null
          rating: number | null
          rating_feedback: string | null
          resolved_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          admin_reply?: string | null
          created_at?: string
          id?: string
          kind?: string
          message: string
          rated_at?: string | null
          rating?: number | null
          rating_feedback?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          admin_reply?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          rated_at?: string | null
          rating?: number | null
          rating_feedback?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          active: boolean
          business_name: string
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          expires_at: string | null
          id: string
          owner_user_id: string
          raw_password: string | null
          recovery_email: string | null
          slug: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean
          business_name: string
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          owner_user_id: string
          raw_password?: string | null
          recovery_email?: string | null
          slug: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean
          business_name?: string
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          owner_user_id?: string
          raw_password?: string | null
          recovery_email?: string | null
          slug?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_backgrounds: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          tenant_id: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          tenant_id?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          tenant_id?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "tenant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "tenant"],
    },
  },
} as const
