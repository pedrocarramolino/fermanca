/**
 * Tipos de la base de datos, escritos a mano para reflejar
 * supabase/migrations/20260803075059_initial_schema.sql mientras no hay un
 * proyecto Supabase enlazado.
 *
 * Una vez enlazado (`supabase link`), regenerar con:
 *   npx supabase gen types typescript --linked > src/core/infrastructure/supabase/database.types.ts
 * y este archivo puede sobrescribirse sin miedo: no debe editarse a mano en
 * el futuro, solo regenerarse.
 */

export type CategoryKind = "system" | "custom";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type SessionBlockStatus = "pending" | "active" | "completed" | "skipped";
export type ThemePreference = "light" | "dark" | "system";
export type SoundChoice = "classic" | "bell" | "metronome" | "piano" | "alarm" | "none";
export type Locale = "es" | "en" | "de";
export type FriendshipStatus = "pending" | "accepted";

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          owner_id: string | null;
          kind: CategoryKind;
          slug: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          kind: CategoryKind;
          slug?: string | null;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Insert"]>;
        Relationships: [];
      };
      template_blocks: {
        Row: {
          id: string;
          template_id: string;
          category_id: string;
          name: string;
          duration_seconds: number;
          color: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          category_id: string;
          name: string;
          duration_seconds: number;
          color: string;
          position: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["template_blocks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "template_blocks_template_id_fkey";
            columns: ["template_id"];
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          owner_id: string;
          template_id: string | null;
          status: SessionStatus;
          planned_duration_seconds: number;
          actual_duration_seconds: number;
          started_at: string;
          ended_at: string | null;
          final_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          template_id?: string | null;
          status?: SessionStatus;
          planned_duration_seconds: number;
          actual_duration_seconds?: number;
          started_at?: string;
          ended_at?: string | null;
          final_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      session_blocks: {
        Row: {
          id: string;
          session_id: string;
          category_id: string;
          name: string;
          color: string;
          position: number;
          planned_duration_seconds: number;
          actual_duration_seconds: number;
          status: SessionBlockStatus;
          started_at: string | null;
          ended_at: string | null;
          note: string | null;
          phase_alert_sent: boolean;
          phase_reminder_sent: boolean;
          qstash_message_id: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          category_id: string;
          name: string;
          color: string;
          position: number;
          planned_duration_seconds: number;
          actual_duration_seconds?: number;
          status?: SessionBlockStatus;
          started_at?: string | null;
          ended_at?: string | null;
          note?: string | null;
          phase_alert_sent?: boolean;
          phase_reminder_sent?: boolean;
          qstash_message_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["session_blocks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "session_blocks_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          owner_id: string;
          time_of_day: string;
          days_of_week: number[];
          enabled: boolean;
          qstash_schedule_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          time_of_day: string;
          days_of_week?: number[];
          enabled?: boolean;
          qstash_schedule_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          owner_id: string;
          theme: ThemePreference;
          sound: SoundChoice;
          volume: number;
          vibration_enabled: boolean;
          visual_alert_duration_ms: number;
          accent_color: string | null;
          timezone: string;
          locale: Locale;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          theme?: ThemePreference;
          sound?: SoundChoice;
          volume?: number;
          vibration_enabled?: boolean;
          visual_alert_duration_ms?: number;
          accent_color?: string | null;
          timezone?: string;
          locale?: Locale;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          owner_id: string;
          username: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          username: string;
          invite_code: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          low_id: string;
          high_id: string;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
