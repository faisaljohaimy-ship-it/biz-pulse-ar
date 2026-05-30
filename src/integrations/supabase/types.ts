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
      intelligence_alerts: {
        Row: {
          acknowledged_at: string | null
          business_impact_score: number
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          owner: string | null
          related_event: string | null
          resolved_at: string | null
          route: string | null
          severity: Database["public"]["Enums"]["intel_alert_severity"]
          source: string | null
          title: string
          title_en: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          business_impact_score?: number
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          owner?: string | null
          related_event?: string | null
          resolved_at?: string | null
          route?: string | null
          severity?: Database["public"]["Enums"]["intel_alert_severity"]
          source?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          business_impact_score?: number
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          owner?: string | null
          related_event?: string | null
          resolved_at?: string | null
          route?: string | null
          severity?: Database["public"]["Enums"]["intel_alert_severity"]
          source?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_alerts_related_event_fkey"
            columns: ["related_event"]
            isOneToOne: false
            referencedRelation: "intelligence_events"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_events: {
        Row: {
          created_at: string
          decision_route: string | null
          department: string | null
          depends_on: string[]
          due_at: string | null
          external_ref: string | null
          id: string
          impact: Database["public"]["Enums"]["intel_impact"]
          kind: Database["public"]["Enums"]["intel_event_kind"]
          last_update: string
          metadata: Json
          owner: string | null
          progress: number
          source: string | null
          status: Database["public"]["Enums"]["intel_event_status"]
          title: string
          title_en: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_route?: string | null
          department?: string | null
          depends_on?: string[]
          due_at?: string | null
          external_ref?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["intel_impact"]
          kind: Database["public"]["Enums"]["intel_event_kind"]
          last_update?: string
          metadata?: Json
          owner?: string | null
          progress?: number
          source?: string | null
          status?: Database["public"]["Enums"]["intel_event_status"]
          title: string
          title_en?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_route?: string | null
          department?: string | null
          depends_on?: string[]
          due_at?: string | null
          external_ref?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["intel_impact"]
          kind?: Database["public"]["Enums"]["intel_event_kind"]
          last_update?: string
          metadata?: Json
          owner?: string | null
          progress?: number
          source?: string | null
          status?: Database["public"]["Enums"]["intel_event_status"]
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_docs: {
        Row: {
          content: string
          created_at: string
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_shared: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_agent: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "manager" | "member"
      intel_alert_severity: "low" | "medium" | "high" | "critical"
      intel_event_kind:
        | "decision"
        | "initiative"
        | "commitment"
        | "risk"
        | "recommendation"
        | "meeting"
        | "dependency"
        | "escalation"
        | "board_action"
      intel_event_status:
        | "open"
        | "in_progress"
        | "blocked"
        | "done"
        | "forgotten"
      intel_impact: "low" | "medium" | "high" | "critical"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "manager", "member"],
      intel_alert_severity: ["low", "medium", "high", "critical"],
      intel_event_kind: [
        "decision",
        "initiative",
        "commitment",
        "risk",
        "recommendation",
        "meeting",
        "dependency",
        "escalation",
        "board_action",
      ],
      intel_event_status: [
        "open",
        "in_progress",
        "blocked",
        "done",
        "forgotten",
      ],
      intel_impact: ["low", "medium", "high", "critical"],
    },
  },
} as const
