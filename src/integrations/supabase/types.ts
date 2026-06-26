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
      agent_definitions: {
        Row: {
          created_at: string
          enabled: boolean
          goal: string
          id: string
          memory_scope: string
          metadata: Json
          model: string
          name: string
          org_id: string
          owner_id: string | null
          permissions: string[]
          system_prompt: string
          tool_allowlist: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          goal: string
          id: string
          memory_scope?: string
          metadata?: Json
          model?: string
          name: string
          org_id?: string
          owner_id?: string | null
          permissions?: string[]
          system_prompt: string
          tool_allowlist?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          goal?: string
          id?: string
          memory_scope?: string
          metadata?: Json
          model?: string
          name?: string
          org_id?: string
          owner_id?: string | null
          permissions?: string[]
          system_prompt?: string
          tool_allowlist?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_agent_definitions_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          audit_json: Json
          context_json: Json
          error: string | null
          finished_at: string | null
          goal_override: string | null
          id: string
          org_id: string
          started_at: string
          status: string
          steps: number
          summary: string | null
          triggered_by: string | null
        }
        Insert: {
          agent_id: string
          audit_json?: Json
          context_json?: Json
          error?: string | null
          finished_at?: string | null
          goal_override?: string | null
          id?: string
          org_id?: string
          started_at?: string
          status?: string
          steps?: number
          summary?: string | null
          triggered_by?: string | null
        }
        Update: {
          agent_id?: string
          audit_json?: Json
          context_json?: Json
          error?: string | null
          finished_at?: string | null
          goal_override?: string | null
          id?: string
          org_id?: string
          started_at?: string
          status?: string
          steps?: number
          summary?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agent_runs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      aria_decisions: {
        Row: {
          confidence: number | null
          created_at: string
          executed_tool: string | null
          id: string
          org_id: string
          rationale: string | null
          recommendation: string
          status: string
          thread_id: string | null
          tool_payload: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          executed_tool?: string | null
          id?: string
          org_id?: string
          rationale?: string | null
          recommendation: string
          status?: string
          thread_id?: string | null
          tool_payload?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          executed_tool?: string | null
          id?: string
          org_id?: string
          rationale?: string | null
          recommendation?: string
          status?: string
          thread_id?: string | null
          tool_payload?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_aria_decisions_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          org_id: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aria_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "aria_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_aria_document_chunks_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_documents: {
        Row: {
          chunk_count: number | null
          created_at: string
          error: string | null
          id: string
          mime_type: string | null
          org_id: string
          page_count: number | null
          size_bytes: number | null
          source: string
          status: string
          storage_path: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          error?: string | null
          id?: string
          mime_type?: string | null
          org_id?: string
          page_count?: number | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          error?: string | null
          id?: string
          mime_type?: string | null
          org_id?: string
          page_count?: number | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_aria_documents_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_knowledge: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          org_id: string
          source: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          org_id?: string
          source: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          org_id?: string
          source?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_aria_knowledge_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance: number
          key: string
          last_used_at: string
          org_id: string
          scope: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number
          key: string
          last_used_at?: string
          org_id?: string
          scope?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number
          key?: string
          last_used_at?: string
          org_id?: string
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_aria_memory_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_reports: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          kind: string
          markdown: string
          org_id: string
          payload: Json
          period_end: string | null
          period_start: string | null
          title: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          kind: string
          markdown?: string
          org_id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          title: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string
          markdown?: string
          org_id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_aria_reports_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          org_id: string
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
          org_id?: string
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
          org_id?: string
          route?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_actions: {
        Row: {
          briefing_id: string | null
          created_at: string
          id: string
          org_id: string
          priority: number
          title: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
          priority?: number
          title: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
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
          {
            foreignKeyName: "fk_briefing_actions_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_opportunities: {
        Row: {
          briefing_id: string | null
          created_at: string
          id: string
          org_id: string
          potential: number
          title: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
          potential?: number
          title: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
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
          {
            foreignKeyName: "fk_briefing_opportunities_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
          {
            foreignKeyName: "fk_briefing_risks_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          period_from?: string | null
          period_to?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_outcomes_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enterprise_events: {
        Row: {
          actor_id: string | null
          correlation_id: string | null
          error: string | null
          id: string
          occurred_at: string
          org_id: string
          payload_json: Json
          processed_at: string | null
          retry_count: number
          source: string
          status: string
          topic: string
        }
        Insert: {
          actor_id?: string | null
          correlation_id?: string | null
          error?: string | null
          id?: string
          occurred_at?: string
          org_id?: string
          payload_json?: Json
          processed_at?: string | null
          retry_count?: number
          source?: string
          status?: string
          topic: string
        }
        Update: {
          actor_id?: string | null
          correlation_id?: string | null
          error?: string | null
          id?: string
          occurred_at?: string
          org_id?: string
          payload_json?: Json
          processed_at?: string | null
          retry_count?: number
          source?: string
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_enterprise_events_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_briefings: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          org_id: string
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
          org_id?: string
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
          org_id?: string
          summary?: string | null
          summary_en?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_executive_briefings_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policies: {
        Row: {
          coverage: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          org_id: string
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
          org_id?: string
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
          org_id?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_governance_policies_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_systems: {
        Row: {
          contract_ends: string | null
          created_at: string
          criticality: string
          id: string
          kind: string
          name: string
          org_id: string
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
          org_id?: string
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
          org_id?: string
          owner?: string | null
          risk?: string
          sla?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_governance_systems_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_microsoft: {
        Row: {
          client_id: string | null
          created_at: string
          default_channel_id: string | null
          default_site_id: string | null
          default_team_id: string | null
          id: string
          last_test_error: string | null
          last_test_status: string | null
          last_test_user: string | null
          last_tested_at: string | null
          notes: string | null
          org_id: string
          redirect_uris: string[]
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          default_channel_id?: string | null
          default_site_id?: string | null
          default_team_id?: string | null
          id?: string
          last_test_error?: string | null
          last_test_status?: string | null
          last_test_user?: string | null
          last_tested_at?: string | null
          notes?: string | null
          org_id?: string
          redirect_uris?: string[]
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          default_channel_id?: string | null
          default_site_id?: string | null
          default_team_id?: string | null
          id?: string
          last_test_error?: string | null
          last_test_status?: string | null
          last_test_user?: string | null
          last_tested_at?: string | null
          notes?: string | null
          org_id?: string
          redirect_uris?: string[]
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "fk_intelligence_alerts_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          owner?: string | null
          progress?: number
          source?: string | null
          status?: Database["public"]["Enums"]["intel_event_status"]
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_intelligence_events_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_docs: {
        Row: {
          content: string
          created_at: string
          id: string
          org_id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          org_id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_knowledge_docs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          browser: string | null
          company: string | null
          country: string | null
          created_at: string
          device: string | null
          email: string
          id: string
          ip: string | null
          kind: string
          language: string | null
          metadata: Json
          name: string
          notes: string | null
          org_id: string
          request_id: string | null
          role: string | null
          source: string | null
          status: string
          team_size: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email: string
          id?: string
          ip?: string | null
          kind: string
          language?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          org_id?: string
          request_id?: string | null
          role?: string | null
          source?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email?: string
          id?: string
          ip?: string | null
          kind?: string
          language?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          org_id?: string
          request_id?: string | null
          role?: string | null
          source?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          citations: Json | null
          confidence: number | null
          created_at: string
          id: string
          parts: Json
          role: string
          stage_trace: Json | null
          thread_id: string
          tokens: number | null
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          citations?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          parts: Json
          role: string
          stage_trace?: Json | null
          thread_id: string
          tokens?: number | null
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          citations?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          stage_trace?: Json | null
          thread_id?: string
          tokens?: number | null
          tool_calls?: Json | null
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
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          invited_at: string | null
          joined_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          joined_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          joined_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      outcome_metrics: {
        Row: {
          created_at: string
          driver: string
          driver_en: string | null
          id: string
          impact_value: number | null
          org_id: string
          outcome_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          driver: string
          driver_en?: string | null
          id?: string
          impact_value?: number | null
          org_id?: string
          outcome_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          driver?: string
          driver_en?: string | null
          id?: string
          impact_value?: number | null
          org_id?: string
          outcome_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_outcome_metrics_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
        Relationships: [
          {
            foreignKeyName: "fk_pulse_crises_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          owner?: string
          risk?: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pulse_execution_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_kpis: {
        Row: {
          created_at: string
          delta: string
          id: string
          key: string
          label: string
          label_en: string
          org_id: string
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
          org_id?: string
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
          org_id?: string
          sort_order?: number
          tone?: string
          trend?: string
          updated_at?: string
          user_id?: string
          value?: string
          why?: string
          why_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pulse_kpis_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
        Relationships: [
          {
            foreignKeyName: "fk_pulse_memory_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          channel_id: string | null
          created_at: string
          created_by: string
          enabled: boolean
          frequency: string
          hour_utc: number
          id: string
          last_error: string | null
          last_run_at: string | null
          last_share_url: string | null
          last_status: string | null
          name: string
          next_run_at: string | null
          org_id: string
          range_window: string
          recipients: string[]
          site_id: string
          team_id: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean
          frequency: string
          hour_utc?: number
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_share_url?: string | null
          last_status?: string | null
          name: string
          next_run_at?: string | null
          org_id?: string
          range_window?: string
          recipients?: string[]
          site_id: string
          team_id?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean
          frequency?: string
          hour_utc?: number
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_share_url?: string | null
          last_status?: string | null
          name?: string
          next_run_at?: string | null
          org_id?: string
          range_window?: string
          recipients?: string[]
          site_id?: string
          team_id?: string | null
          updated_at?: string
          weekday?: number | null
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_activity_events_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_assets_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_buildings_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          resolution?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_cameras_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          ref?: string
          site_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_cctv_alerts_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          staff_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_circles_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_contractors: {
        Row: {
          allowed_site_ids: string[]
          compliance_score: number
          contract_no: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          insurance_expiry: string | null
          name: string
          org_id: string
          permit_types: string[]
          phone: string | null
          ref: string
          status: string
          updated_at: string
          workers_count: number
        }
        Insert: {
          allowed_site_ids?: string[]
          compliance_score?: number
          contract_no: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          insurance_expiry?: string | null
          name: string
          org_id?: string
          permit_types?: string[]
          phone?: string | null
          ref: string
          status?: string
          updated_at?: string
          workers_count?: number
        }
        Update: {
          allowed_site_ids?: string[]
          compliance_score?: number
          contract_no?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          insurance_expiry?: string | null
          name?: string
          org_id?: string
          permit_types?: string[]
          phone?: string | null
          ref?: string
          status?: string
          updated_at?: string
          workers_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_contractors_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          screens_count?: number
          shift_lead?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_control_rooms_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_gates_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          aria_auto_analyzed: boolean
          assigned_to: string | null
          attachments: Json
          attachments_count: number
          category: string
          corrective_actions: Json
          created_at: string
          created_by: string | null
          escalated: boolean
          executive_review: string | null
          executive_reviewed_at: string | null
          executive_reviewed_by: string | null
          id: string
          org_id: string
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
          aria_auto_analyzed?: boolean
          assigned_to?: string | null
          attachments?: Json
          attachments_count?: number
          category: string
          corrective_actions?: Json
          created_at?: string
          created_by?: string | null
          escalated?: boolean
          executive_review?: string | null
          executive_reviewed_at?: string | null
          executive_reviewed_by?: string | null
          id?: string
          org_id?: string
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
          aria_auto_analyzed?: boolean
          assigned_to?: string | null
          attachments?: Json
          attachments_count?: number
          category?: string
          corrective_actions?: Json
          created_at?: string
          created_by?: string | null
          escalated?: boolean
          executive_review?: string | null
          executive_reviewed_at?: string | null
          executive_reviewed_by?: string | null
          id?: string
          org_id?: string
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
            foreignKeyName: "fk_sec_incidents_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_patrol_teams_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "fk_sec_patrols_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "fk_sec_permits_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          progress?: number
          ref?: string
          spent_sar?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_projects_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_projects_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_reports: {
        Row: {
          created_at: string
          format: string
          generated_by: string | null
          generated_by_name: string | null
          id: string
          kind: string
          meta: Json
          org_id: string
          range_from: string | null
          range_to: string | null
          related_entity_id: string | null
          related_entity_ref: string | null
          related_entity_type: string | null
          size_bytes: number | null
          storage_path: string | null
          title: string
        }
        Insert: {
          created_at?: string
          format: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          kind: string
          meta?: Json
          org_id?: string
          range_from?: string | null
          range_to?: string | null
          related_entity_id?: string | null
          related_entity_ref?: string | null
          related_entity_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title: string
        }
        Update: {
          created_at?: string
          format?: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          kind?: string
          meta?: Json
          org_id?: string
          range_from?: string | null
          range_to?: string | null
          related_entity_id?: string | null
          related_entity_ref?: string | null
          related_entity_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          staff_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_sections_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_sensors: {
        Row: {
          building_id: string | null
          code: string
          created_at: string
          id: string
          last_reading_at: string
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "fk_sec_sensors_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          sensitivity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_sites_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_sites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "sec_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_vehicles: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          company: string | null
          contractor_id: string | null
          created_at: string
          created_by: string | null
          driver_id_number: string | null
          driver_name: string
          driver_phone: string | null
          gate_id: string | null
          id: string
          notes: string | null
          org_id: string
          permit_expires_at: string | null
          permit_no: string | null
          plate: string
          ref: string
          site_id: string | null
          status: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          company?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id_number?: string | null
          driver_name: string
          driver_phone?: string | null
          gate_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          permit_expires_at?: string | null
          permit_no?: string | null
          plate: string
          ref: string
          site_id?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          company?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id_number?: string | null
          driver_name?: string
          driver_phone?: string | null
          gate_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          permit_expires_at?: string | null
          permit_no?: string | null
          plate?: string
          ref?: string
          site_id?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_vehicles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "sec_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_vehicles_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "sec_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_vehicles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_vehicles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sec_sites"
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
          created_by: string | null
          expected_at: string | null
          full_name: string
          gate_id: string | null
          host: string
          id: string
          id_number: string | null
          org_id: string
          organization: string | null
          phone: string | null
          purpose: string | null
          qr_token: string | null
          ref: string
          site_id: string | null
          status: string
          vehicle_plate: string | null
        }
        Insert: {
          badge_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          full_name: string
          gate_id?: string | null
          host: string
          id?: string
          id_number?: string | null
          org_id?: string
          organization?: string | null
          phone?: string | null
          purpose?: string | null
          qr_token?: string | null
          ref: string
          site_id?: string | null
          status?: string
          vehicle_plate?: string | null
        }
        Update: {
          badge_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          full_name?: string
          gate_id?: string | null
          host?: string
          id?: string
          id_number?: string | null
          org_id?: string
          organization?: string | null
          phone?: string | null
          purpose?: string | null
          qr_token?: string | null
          ref?: string
          site_id?: string | null
          status?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sec_visitors_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_visitors_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "sec_gates"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
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
            foreignKeyName: "fk_sec_work_orders_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          pinned: boolean
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned?: boolean
          summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned?: boolean
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_executions: {
        Row: {
          actor_id: string | null
          agent_run_id: string | null
          approved_at: string | null
          approved_by: string | null
          attempt: number
          correlation_id: string
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          input_json: Json
          org_id: string
          output_json: Json | null
          parent_execution_id: string | null
          started_at: string | null
          status: string
          tool_id: string
          workflow_run_id: string | null
        }
        Insert: {
          actor_id?: string | null
          agent_run_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attempt?: number
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_json?: Json
          org_id?: string
          output_json?: Json | null
          parent_execution_id?: string | null
          started_at?: string | null
          status?: string
          tool_id: string
          workflow_run_id?: string | null
        }
        Update: {
          actor_id?: string | null
          agent_run_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attempt?: number
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_json?: Json
          org_id?: string
          output_json?: Json | null
          parent_execution_id?: string | null
          started_at?: string | null
          status?: string
          tool_id?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tool_executions_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_executions_parent_execution_id_fkey"
            columns: ["parent_execution_id"]
            isOneToOne: false
            referencedRelation: "tool_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_executions_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_registry: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          metadata: Json
          name: string
          org_id: string
          permissions: string[]
          requires_approval: boolean
          rollback_kind: string
          rollback_tool_id: string | null
          schema_json: Json
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          metadata?: Json
          name: string
          org_id?: string
          permissions?: string[]
          requires_approval?: boolean
          rollback_kind?: string
          rollback_tool_id?: string | null
          schema_json?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          permissions?: string[]
          requires_approval?: boolean
          rollback_kind?: string
          rollback_tool_id?: string | null
          schema_json?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_tool_registry_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_milestones: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          org_id: string
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
          org_id?: string
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
          org_id?: string
          program_id?: string | null
          status?: string
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transformation_milestones_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          org_id: string
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
          org_id?: string
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
          org_id?: string
          phase?: string
          progress?: number
          savings?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transformation_programs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_runs: {
        Row: {
          context_json: Json
          current_step: string | null
          error: string | null
          finished_at: string | null
          id: string
          org_id: string
          started_at: string
          status: string
          trigger_event: string | null
          trigger_payload: Json
          triggered_by: string | null
          workflow_id: string
        }
        Insert: {
          context_json?: Json
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          org_id?: string
          started_at?: string
          status?: string
          trigger_event?: string | null
          trigger_payload?: Json
          triggered_by?: string | null
          workflow_id: string
        }
        Update: {
          context_json?: Json
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          org_id?: string
          started_at?: string
          status?: string
          trigger_event?: string | null
          trigger_payload?: Json
          triggered_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflow_runs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_runs: {
        Row: {
          attempt: number
          error: string | null
          finished_at: string | null
          id: string
          input_json: Json
          kind: string
          org_id: string
          output_json: Json | null
          run_id: string
          started_at: string | null
          status: string
          step_id: string
          tool_execution_id: string | null
        }
        Insert: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          input_json?: Json
          kind: string
          org_id?: string
          output_json?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          step_id: string
          tool_execution_id?: string | null
        }
        Update: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          input_json?: Json
          kind?: string
          org_id?: string
          output_json?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_id?: string
          tool_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflow_step_runs_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_tool_execution_id_fkey"
            columns: ["tool_execution_id"]
            isOneToOne: false
            referencedRelation: "tool_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          definition_json: Json
          description: string | null
          enabled: boolean
          id: string
          name: string
          org_id: string
          owner_id: string | null
          tags: string[]
          trigger_topic: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          definition_json: Json
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          org_id?: string
          owner_id?: string | null
          tags?: string[]
          trigger_topic?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          definition_json?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          org_id?: string
          owner_id?: string | null
          tags?: string[]
          trigger_topic?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflows_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aria_match_documents: {
        Args: { _limit?: number; _query: string; _user_id: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
          title: string
        }[]
      }
      aria_match_knowledge: {
        Args: { _limit?: number; _query: string; _tags?: string[] }
        Returns: {
          content: string
          id: string
          similarity: number
          source: string
          tags: string[]
          title: string
        }[]
      }
      aria_match_memory: {
        Args: {
          _limit?: number
          _query: string
          _scope?: string
          _user_id: string
        }
        Returns: {
          content: string
          id: string
          importance: number
          key: string
          scope: string
          similarity: number
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: {
          _min_role?: Database["public"]["Enums"]["org_role"]
          _org: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
      org_role: "owner" | "admin" | "manager" | "operator" | "viewer"
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
      org_role: ["owner", "admin", "manager", "operator", "viewer"],
    },
  },
} as const
