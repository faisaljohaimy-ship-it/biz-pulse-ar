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
      ai_usage: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string
          feature: string | null
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          feature?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          feature?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          route: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          route?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          route?: string | null
          user_id?: string
        }
        Relationships: []
      }
      briefing_actions: {
        Row: {
          briefing_id: string | null
          created_at: string
          id: string
          priority: number
          title: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          priority?: number
          title: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          priority?: number
          title?: string
          title_en?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_actions_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "executive_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_opportunities: {
        Row: {
          briefing_id: string | null
          created_at: string
          id: string
          potential: number
          title: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          potential?: number
          title: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          potential?: number
          title?: string
          title_en?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_opportunities_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "executive_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_risks: {
        Row: {
          briefing_id: string | null
          created_at: string
          id: string
          level: string
          probability: number
          title: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          level?: string
          probability?: number
          title: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          level?: string
          probability?: number
          title?: string
          title_en?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_risks_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "executive_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      business_outcomes: {
        Row: {
          category: string
          created_at: string
          delta: string | null
          id: string
          label: string
          label_en: string | null
          period_from: string | null
          period_to: string | null
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          delta?: string | null
          id?: string
          label: string
          label_en?: string | null
          period_from?: string | null
          period_to?: string | null
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          delta?: string | null
          id?: string
          label?: string
          label_en?: string | null
          period_from?: string | null
          period_to?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      executive_briefings: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          summary: string | null
          summary_en: string | null
          title: string
          title_en: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          summary?: string | null
          summary_en?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          summary?: string | null
          summary_en?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      governance_policies: {
        Row: {
          coverage: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          coverage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          coverage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      governance_systems: {
        Row: {
          contract_ends: string | null
          created_at: string
          criticality: string
          id: string
          kind: string
          name: string
          owner: string | null
          risk: string
          sla: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_ends?: string | null
          created_at?: string
          criticality?: string
          id?: string
          kind: string
          name: string
          owner?: string | null
          risk?: string
          sla?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_ends?: string | null
          created_at?: string
          criticality?: string
          id?: string
          kind?: string
          name?: string
          owner?: string | null
          risk?: string
          sla?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          ip: string | null
          kind: string
          metadata: Json
          name: string
          notes: string | null
          role: string | null
          source: string | null
          status: string
          team_size: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          kind: string
          metadata?: Json
          name: string
          notes?: string | null
          role?: string | null
          source?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          kind?: string
          metadata?: Json
          name?: string
          notes?: string | null
          role?: string | null
          source?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
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
      outcome_metrics: {
        Row: {
          created_at: string
          driver: string
          driver_en: string | null
          id: string
          impact_value: number | null
          outcome_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          driver: string
          driver_en?: string | null
          id?: string
          impact_value?: number | null
          outcome_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          driver?: string
          driver_en?: string | null
          id?: string
          impact_value?: number | null
          outcome_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_metrics_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "business_outcomes"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
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
      pulse_crises: {
        Row: {
          action: string
          action_en: string
          category: string
          created_at: string
          id: string
          impact: string
          impact_en: string
          key: string
          linked_memory_key: string | null
          owner: string
          probability: number
          risk_score: number
          route: string
          sort_order: number
          title: string
          title_en: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string
          action_en?: string
          category: string
          created_at?: string
          id?: string
          impact?: string
          impact_en?: string
          key: string
          linked_memory_key?: string | null
          owner?: string
          probability?: number
          risk_score?: number
          route?: string
          sort_order?: number
          title: string
          title_en: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          action_en?: string
          category?: string
          created_at?: string
          id?: string
          impact?: string
          impact_en?: string
          key?: string
          linked_memory_key?: string | null
          owner?: string
          probability?: number
          risk_score?: number
          route?: string
          sort_order?: number
          title?: string
          title_en?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pulse_execution: {
        Row: {
          action: string
          action_en: string
          completion: number
          created_at: string
          decision: string
          decision_en: string
          department: string
          dependency: string
          dependency_en: string
          id: string
          key: string
          owner: string
          risk: string
          sort_order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string
          action_en?: string
          completion?: number
          created_at?: string
          decision: string
          decision_en: string
          department?: string
          dependency?: string
          dependency_en?: string
          id?: string
          key: string
          owner?: string
          risk?: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          action_en?: string
          completion?: number
          created_at?: string
          decision?: string
          decision_en?: string
          department?: string
          dependency?: string
          dependency_en?: string
          id?: string
          key?: string
          owner?: string
          risk?: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pulse_kpis: {
        Row: {
          created_at: string
          delta: string
          id: string
          key: string
          label: string
          label_en: string
          sort_order: number
          tone: string
          trend: string
          updated_at: string
          user_id: string
          value: string
          why: string
          why_en: string
        }
        Insert: {
          created_at?: string
          delta?: string
          id?: string
          key: string
          label: string
          label_en: string
          sort_order?: number
          tone?: string
          trend?: string
          updated_at?: string
          user_id: string
          value: string
          why?: string
          why_en?: string
        }
        Update: {
          created_at?: string
          delta?: string
          id?: string
          key?: string
          label?: string
          label_en?: string
          sort_order?: number
          tone?: string
          trend?: string
          updated_at?: string
          user_id?: string
          value?: string
          why?: string
          why_en?: string
        }
        Relationships: []
      }
      pulse_memory: {
        Row: {
          created_at: string
          days_silent: number
          decision_route: string | null
          department: string
          depends_on: string[]
          due_at: string | null
          id: string
          impact: string
          key: string
          kind: string
          owner: string
          progress: number
          sort_order: number
          source: string
          source_en: string
          status: string
          title: string
          title_en: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_silent?: number
          decision_route?: string | null
          department?: string
          depends_on?: string[]
          due_at?: string | null
          id?: string
          impact?: string
          key: string
          kind: string
          owner?: string
          progress?: number
          sort_order?: number
          source?: string
          source_en?: string
          status?: string
          title: string
          title_en: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_silent?: number
          decision_route?: string | null
          department?: string
          depends_on?: string[]
          due_at?: string | null
          id?: string
          impact?: string
          key?: string
          kind?: string
          owner?: string
          progress?: number
          sort_order?: number
          source?: string
          source_en?: string
          status?: string
          title?: string
          title_en?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sec_activity_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          entity_id: string
          entity_ref: string | null
          entity_type: string
          event: string
          id: string
          occurred_at: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          entity_id: string
          entity_ref?: string | null
          entity_type: string
          event: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          entity_id?: string
          entity_ref?: string | null
          entity_type?: string
          event?: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Relationships: []
      }
      sec_assets: {
        Row: {
          code: string
          created_at: string
          health: number
          id: string
          kind: string
          last_seen_at: string
          name_ar: string
          name_en: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          health?: number
          id?: string
          kind: string
          last_seen_at?: string
          name_ar: string
          name_en: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          health?: number
          id?: string
          kind?: string
          last_seen_at?: string
          name_ar?: string
          name_en?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_buildings: {
        Row: {
          code: string
          created_at: string
          floors: number
          id: string
          name_ar: string
          name_en: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          floors?: number
          id?: string
          name_ar: string
          name_en: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          floors?: number
          id?: string
          name_ar?: string
          name_en?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_buildings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_cameras: {
        Row: {
          building_id: string | null
          code: string
          created_at: string
          health: number
          id: string
          kind: string
          last_seen_at: string
          resolution: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          code: string
          created_at?: string
          health?: number
          id?: string
          kind?: string
          last_seen_at?: string
          resolution?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          code?: string
          created_at?: string
          health?: number
          id?: string
          kind?: string
          last_seen_at?: string
          resolution?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_cameras_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "sec_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_cameras_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_cctv_alerts: {
        Row: {
          acknowledged_by: string | null
          alert_type: string
          camera_code: string
          confidence: number
          created_at: string
          detected_at: string
          id: string
          notes: string | null
          ref: string
          site_id: string | null
          status: string
        }
        Insert: {
          acknowledged_by?: string | null
          alert_type: string
          camera_code: string
          confidence?: number
          created_at?: string
          detected_at?: string
          id?: string
          notes?: string | null
          ref: string
          site_id?: string | null
          status?: string
        }
        Update: {
          acknowledged_by?: string | null
          alert_type?: string
          camera_code?: string
          confidence?: number
          created_at?: string
          detected_at?: string
          id?: string
          notes?: string | null
          ref?: string
          site_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_cctv_alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_circles: {
        Row: {
          code: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          manager: string | null
          name_ar: string
          name_en: string
          staff_count: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          manager?: string | null
          name_ar: string
          name_en: string
          staff_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          manager?: string | null
          name_ar?: string
          name_en?: string
          staff_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      sec_contractors: {
        Row: {
          compliance_score: number
          contract_no: string
          created_at: string
          expires_at: string | null
          id: string
          name: string
          ref: string
          status: string
          updated_at: string
          workers_count: number
        }
        Insert: {
          compliance_score?: number
          contract_no: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name: string
          ref: string
          status?: string
          updated_at?: string
          workers_count?: number
        }
        Update: {
          compliance_score?: number
          contract_no?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string
          ref?: string
          status?: string
          updated_at?: string
          workers_count?: number
        }
        Relationships: []
      }
      sec_control_rooms: {
        Row: {
          circle_id: string | null
          code: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
          operators_count: number
          screens_count: number
          shift_lead: string | null
          status: string
          updated_at: string
        }
        Insert: {
          circle_id?: string | null
          code: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          operators_count?: number
          screens_count?: number
          shift_lead?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          circle_id?: string | null
          code?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          operators_count?: number
          screens_count?: number
          shift_lead?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_control_rooms_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_gates: {
        Row: {
          building_id: string | null
          code: string
          created_at: string
          events_today: number
          health: number
          id: string
          kind: string
          last_event_at: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          code: string
          created_at?: string
          events_today?: number
          health?: number
          id?: string
          kind?: string
          last_event_at?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          code?: string
          created_at?: string
          events_today?: number
          health?: number
          id?: string
          kind?: string
          last_event_at?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_gates_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "sec_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_gates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_incidents: {
        Row: {
          ai_risk_score: number | null
          ai_summary: string | null
          assigned_to: string | null
          attachments: Json
          category: string
          corrective_actions: Json
          created_at: string
          created_by: string | null
          escalated: boolean
          id: string
          owner: string | null
          priority: string
          ref: string
          reported_at: string
          resolved_at: string | null
          response_minutes: number | null
          root_cause: string | null
          severity: string
          site_id: string | null
          status: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          ai_risk_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          attachments?: Json
          category: string
          corrective_actions?: Json
          created_at?: string
          created_by?: string | null
          escalated?: boolean
          id?: string
          owner?: string | null
          priority?: string
          ref: string
          reported_at?: string
          resolved_at?: string | null
          response_minutes?: number | null
          root_cause?: string | null
          severity: string
          site_id?: string | null
          status?: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          ai_risk_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          attachments?: Json
          category?: string
          corrective_actions?: Json
          created_at?: string
          created_by?: string | null
          escalated?: boolean
          id?: string
          owner?: string | null
          priority?: string
          ref?: string
          reported_at?: string
          resolved_at?: string | null
          response_minutes?: number | null
          root_cause?: string | null
          severity?: string
          site_id?: string | null
          status?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_patrol_teams: {
        Row: {
          circle_id: string | null
          code: string
          created_at: string
          id: string
          leader: string | null
          members_count: number
          name_ar: string
          status: string
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          circle_id?: string | null
          code: string
          created_at?: string
          id?: string
          leader?: string | null
          members_count?: number
          name_ar: string
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          circle_id?: string | null
          code?: string
          created_at?: string
          id?: string
          leader?: string | null
          members_count?: number
          name_ar?: string
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sec_patrol_teams_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_patrols: {
        Row: {
          checkpoints_done: number
          checkpoints_total: number
          created_at: string
          ended_at: string | null
          id: string
          ref: string
          route: string
          site_id: string | null
          started_at: string | null
          status: string
          team: string
          updated_at: string
        }
        Insert: {
          checkpoints_done?: number
          checkpoints_total?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          ref: string
          route: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          team: string
          updated_at?: string
        }
        Update: {
          checkpoints_done?: number
          checkpoints_total?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          ref?: string
          route?: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          team?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_patrols_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_permits: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver: string | null
          attachments: Json
          contractor: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          notes: string | null
          ref: string
          risk_level: string
          site_id: string | null
          starts_at: string
          status: string
          updated_at: string
          work_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver?: string | null
          attachments?: Json
          contractor: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          ref: string
          risk_level?: string
          site_id?: string | null
          starts_at: string
          status?: string
          updated_at?: string
          work_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver?: string | null
          attachments?: Json
          contractor?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          ref?: string
          risk_level?: string
          site_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_permits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_projects: {
        Row: {
          budget_sar: number
          circle_id: string | null
          contractor: string | null
          created_at: string
          ends_at: string | null
          health: string
          id: string
          kind: string
          manager: string | null
          name_ar: string
          name_en: string
          notes: string | null
          progress: number
          ref: string
          spent_sar: number
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_sar?: number
          circle_id?: string | null
          contractor?: string | null
          created_at?: string
          ends_at?: string | null
          health?: string
          id?: string
          kind: string
          manager?: string | null
          name_ar: string
          name_en: string
          notes?: string | null
          progress?: number
          ref: string
          spent_sar?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_sar?: number
          circle_id?: string | null
          contractor?: string | null
          created_at?: string
          ends_at?: string | null
          health?: string
          id?: string
          kind?: string
          manager?: string | null
          name_ar?: string
          name_en?: string
          notes?: string | null
          progress?: number
          ref?: string
          spent_sar?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_projects_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_sections: {
        Row: {
          code: string
          created_at: string
          head: string | null
          id: string
          name_ar: string
          name_en: string
          staff_count: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          head?: string | null
          id?: string
          name_ar: string
          name_en: string
          staff_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          head?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          staff_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      sec_sensors: {
        Row: {
          building_id: string | null
          code: string
          created_at: string
          id: string
          last_reading_at: string
          reading: number | null
          sensor_type: string
          site_id: string | null
          status: string
          threshold: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          code: string
          created_at?: string
          id?: string
          last_reading_at?: string
          reading?: number | null
          sensor_type: string
          site_id?: string | null
          status?: string
          threshold?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          code?: string
          created_at?: string
          id?: string
          last_reading_at?: string
          reading?: number | null
          sensor_type?: string
          site_id?: string | null
          status?: string
          threshold?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_sensors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "sec_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_sensors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_sites: {
        Row: {
          circle_id: string | null
          code: string
          created_at: string
          guards_count: number
          id: string
          lat: number | null
          lng: number | null
          name_ar: string
          name_en: string
          notes: string | null
          sensitivity: string
          status: string
          updated_at: string
        }
        Insert: {
          circle_id?: string | null
          code: string
          created_at?: string
          guards_count?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name_ar: string
          name_en: string
          notes?: string | null
          sensitivity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          circle_id?: string | null
          code?: string
          created_at?: string
          guards_count?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name_ar?: string
          name_en?: string
          notes?: string | null
          sensitivity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_sites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_visitors: {
        Row: {
          badge_no: string | null
          check_in_at: string
          check_out_at: string | null
          created_at: string
          full_name: string
          host: string
          id: string
          organization: string | null
          purpose: string | null
          ref: string
          site_id: string | null
          status: string
        }
        Insert: {
          badge_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          full_name: string
          host: string
          id?: string
          organization?: string | null
          purpose?: string | null
          ref: string
          site_id?: string | null
          status?: string
        }
        Update: {
          badge_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          full_name?: string
          host?: string
          id?: string
          organization?: string | null
          purpose?: string | null
          ref?: string
          site_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_visitors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_work_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_code: string | null
          asset_kind: string
          assigned_to: string | null
          attachments: Json
          building_id: string | null
          closed_at: string | null
          completion_notes: string | null
          contractor: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          kind: string
          notes: string | null
          opened_at: string
          priority: string
          ref: string
          site_id: string | null
          source_incident_id: string | null
          status: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_code?: string | null
          asset_kind: string
          assigned_to?: string | null
          attachments?: Json
          building_id?: string | null
          closed_at?: string | null
          completion_notes?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          kind: string
          notes?: string | null
          opened_at?: string
          priority?: string
          ref: string
          site_id?: string | null
          source_incident_id?: string | null
          status?: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_code?: string | null
          asset_kind?: string
          assigned_to?: string | null
          attachments?: Json
          building_id?: string | null
          closed_at?: string | null
          completion_notes?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          opened_at?: string
          priority?: string
          ref?: string
          site_id?: string | null
          source_incident_id?: string | null
          status?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_work_orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "sec_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_work_orders_source_incident_id_fkey"
            columns: ["source_incident_id"]
            isOneToOne: false
            referencedRelation: "sec_incidents"
            referencedColumns: ["id"]
          },
        ]
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
      transformation_milestones: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          program_id: string | null
          status: string
          title: string
          title_en: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          program_id?: string | null
          status?: string
          title: string
          title_en?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          program_id?: string | null
          status?: string
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_milestones_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "transformation_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_programs: {
        Row: {
          adoption: number
          created_at: string
          id: string
          name: string
          name_en: string | null
          phase: string
          progress: number
          savings: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adoption?: number
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          phase?: string
          progress?: number
          savings?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adoption?: number
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          phase?: string
          progress?: number
          savings?: string | null
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
