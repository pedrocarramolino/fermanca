/**
 * Tipos de la base de datos, regenerados desde el proyecto Supabase
 * enlazado (fwfwqzpxhwwxodqyrfdx). No editar a mano: tras cada migración,
 * regenerar con el MCP de Supabase (`generate_typescript_types`) o con
 *   npx supabase gen types typescript --linked > src/core/infrastructure/supabase/database.types.ts
 */

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
      announcements: {
        Row: {
          author_id: string
          author_username: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          author_username: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          author_username?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          event_date: string
          id: string
          notify_at: string | null
          owner_id: string
          qstash_schedule_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          notify_at?: string | null
          owner_id: string
          qstash_schedule_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          notify_at?: string | null
          owner_id?: string
          qstash_schedule_id?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_ghost: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          owner_id: string | null
          slug: string | null
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_ghost?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          owner_id?: string | null
          slug?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_ghost?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          owner_id?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          high_id: string | null
          id: string
          low_id: string | null
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          high_id?: string | null
          id?: string
          low_id?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          high_id?: string | null
          id?: string
          low_id?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          invite_code: string
          is_admin: boolean
          owner_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          invite_code: string
          is_admin?: boolean
          owner_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          invite_code?: string
          is_admin?: boolean
          owner_id?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          owner_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          owner_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          owner_id?: string
          p256dh?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days_of_week: number[]
          enabled: boolean
          id: string
          owner_id: string
          qstash_schedule_id: string | null
          time_of_day: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          owner_id: string
          qstash_schedule_id?: string | null
          time_of_day: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          owner_id?: string
          qstash_schedule_id?: string | null
          time_of_day?: string
        }
        Relationships: []
      }
      session_blocks: {
        Row: {
          actual_duration_seconds: number
          category_id: string
          color: string
          ended_at: string | null
          id: string
          name: string
          note: string | null
          paused_remaining_seconds: number | null
          phase_alert_sent: boolean
          phase_reminder_sent: boolean
          planned_duration_seconds: number
          position: number
          qstash_message_id: string | null
          session_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["session_block_status"]
        }
        Insert: {
          actual_duration_seconds?: number
          category_id: string
          color: string
          ended_at?: string | null
          id?: string
          name: string
          note?: string | null
          paused_remaining_seconds?: number | null
          phase_alert_sent?: boolean
          phase_reminder_sent?: boolean
          planned_duration_seconds: number
          position: number
          qstash_message_id?: string | null
          session_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_block_status"]
        }
        Update: {
          actual_duration_seconds?: number
          category_id?: string
          color?: string
          ended_at?: string | null
          id?: string
          name?: string
          note?: string | null
          paused_remaining_seconds?: number | null
          phase_alert_sent?: boolean
          phase_reminder_sent?: boolean
          planned_duration_seconds?: number
          position?: number
          qstash_message_id?: string | null
          session_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_block_status"]
        }
        Relationships: [
          {
            foreignKeyName: "session_blocks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          actor_id: string
          actor_username: string
          created_at: string
          id: string
          session_id: string
          type: string
        }
        Insert: {
          actor_id: string
          actor_username: string
          created_at?: string
          id?: string
          session_id: string
          type: string
        }
        Update: {
          actor_id?: string
          actor_username?: string
          created_at?: string
          id?: string
          session_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_invites: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          invitee_id: string
          invitee_session_id: string | null
          inviter_id: string
          inviter_session_id: string | null
          responded_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          blocks: Json
          created_at?: string
          id?: string
          invitee_id: string
          invitee_session_id?: string | null
          inviter_id: string
          inviter_session_id?: string | null
          responded_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          invitee_id?: string
          invitee_session_id?: string | null
          inviter_id?: string
          inviter_session_id?: string | null
          responded_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_invites_invitee_session_id_fkey"
            columns: ["invitee_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_invites_inviter_session_id_fkey"
            columns: ["inviter_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_invites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_share_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          owner_id: string
          session_share_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          owner_id: string
          session_share_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          owner_id?: string
          session_share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_share_reactions_session_share_id_fkey"
            columns: ["session_share_id"]
            isOneToOne: false
            referencedRelation: "session_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      session_shares: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          owner_avatar_url: string | null
          owner_id: string
          owner_username: string
          session_id: string
          started_at: string
          title: string | null
          total_duration_seconds: number
        }
        Insert: {
          blocks: Json
          created_at?: string
          id?: string
          owner_avatar_url?: string | null
          owner_id: string
          owner_username: string
          session_id: string
          started_at: string
          title?: string | null
          total_duration_seconds: number
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          owner_avatar_url?: string | null
          owner_id?: string
          owner_username?: string
          session_id?: string
          started_at?: string
          title?: string | null
          total_duration_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_duration_seconds: number
          created_at: string
          ended_at: string | null
          final_note: string | null
          id: string
          linked_session_id: string | null
          linked_session_peer_username: string | null
          owner_id: string
          planned_duration_seconds: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          template_id: string | null
        }
        Insert: {
          actual_duration_seconds?: number
          created_at?: string
          ended_at?: string | null
          final_note?: string | null
          id?: string
          linked_session_id?: string | null
          linked_session_peer_username?: string | null
          owner_id: string
          planned_duration_seconds: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
        }
        Update: {
          actual_duration_seconds?: number
          created_at?: string
          ended_at?: string | null
          final_note?: string | null
          id?: string
          linked_session_id?: string | null
          linked_session_peer_username?: string | null
          owner_id?: string
          planned_duration_seconds?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_blocks: {
        Row: {
          category_id: string
          color: string
          created_at: string
          duration_seconds: number
          id: string
          name: string
          position: number
          template_id: string
        }
        Insert: {
          category_id: string
          color: string
          created_at?: string
          duration_seconds: number
          id?: string
          name: string
          position: number
          template_id: string
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          name?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_blocks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          accent_color: string | null
          glass_intensity: number
          locale: string
          owner_id: string
          sound: Database["public"]["Enums"]["sound_choice"]
          theme: Database["public"]["Enums"]["theme_preference"]
          timezone: string
          updated_at: string
          vibration_enabled: boolean
          visual_alert_duration_ms: number
          volume: number
        }
        Insert: {
          accent_color?: string | null
          glass_intensity?: number
          locale?: string
          owner_id: string
          sound?: Database["public"]["Enums"]["sound_choice"]
          theme?: Database["public"]["Enums"]["theme_preference"]
          timezone?: string
          updated_at?: string
          vibration_enabled?: boolean
          visual_alert_duration_ms?: number
          volume?: number
        }
        Update: {
          accent_color?: string | null
          glass_intensity?: number
          locale?: string
          owner_id?: string
          sound?: Database["public"]["Enums"]["sound_choice"]
          theme?: Database["public"]["Enums"]["theme_preference"]
          timezone?: string
          updated_at?: string
          vibration_enabled?: boolean
          visual_alert_duration_ms?: number
          volume?: number
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          owner_id: string
          target_days: number
          target_seconds: number
          week_start: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          owner_id: string
          target_days: number
          target_seconds: number
          week_start: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          target_days?: number
          target_seconds?: number
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category_kind: "system" | "custom"
      session_block_status: "pending" | "active" | "completed" | "skipped"
      session_status: "in_progress" | "completed" | "abandoned"
      sound_choice:
        | "classic"
        | "bell"
        | "metronome"
        | "piano"
        | "none"
        | "alarm"
      theme_preference: "light" | "dark" | "system"
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
      category_kind: ["system", "custom"],
      session_block_status: ["pending", "active", "completed", "skipped"],
      session_status: ["in_progress", "completed", "abandoned"],
      sound_choice: ["classic", "bell", "metronome", "piano", "none", "alarm"],
      theme_preference: ["light", "dark", "system"],
    },
  },
} as const
