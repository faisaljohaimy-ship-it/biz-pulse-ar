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
      _microsoft_sync_config: {
        Row: {
          hook_secret: string | null
          hook_url: string
          id: boolean
          updated_at: string
        }
        Insert: {
          hook_secret?: string | null
          hook_url?: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          hook_secret?: string | null
          hook_url?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
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
          next_step: string | null
          org_id: string
          rationale: string | null
          recommendation: string
          recommended_action: string | null
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
          next_step?: string | null
          org_id?: string
          rationale?: string | null
          recommendation: string
          recommended_action?: string | null
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
          next_step?: string | null
          org_id?: string
          rationale?: string | null
          recommendation?: string
          recommended_action?: string | null
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
      aria_evolution_cycles: {
        Row: {
          applied_count: number
          created_at: string
          critical_count: number
          decision: string
          deferred_count: number
          finished_at: string
          id: string
          issues_count: number
          readiness_score: number
          reasons: string[]
          report: Json
          started_at: string
          trigger: string
        }
        Insert: {
          applied_count?: number
          created_at?: string
          critical_count?: number
          decision: string
          deferred_count?: number
          finished_at: string
          id?: string
          issues_count?: number
          readiness_score?: number
          reasons?: string[]
          report: Json
          started_at: string
          trigger: string
        }
        Update: {
          applied_count?: number
          created_at?: string
          critical_count?: number
          decision?: string
          deferred_count?: number
          finished_at?: string
          id?: string
          issues_count?: number
          readiness_score?: number
          reasons?: string[]
          report?: Json
          started_at?: string
          trigger?: string
        }
        Relationships: []
      }
      aria_improvement_proposals: {
        Row: {
          area: string
          created_at: string
          decided_by: string | null
          id: string
          impact: string
          org_id: string
          proposal_ar: string
          status: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          decided_by?: string | null
          id?: string
          impact: string
          org_id?: string
          proposal_ar: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          decided_by?: string | null
          id?: string
          impact?: string
          org_id?: string
          proposal_ar?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      aria_incidents: {
        Row: {
          detail: string
          device_class: string | null
          id: string
          kind: string
          model: string | null
          occurred_at: string
          resolved: boolean
          user_id: string | null
        }
        Insert: {
          detail: string
          device_class?: string | null
          id?: string
          kind: string
          model?: string | null
          occurred_at?: string
          resolved?: boolean
          user_id?: string | null
        }
        Update: {
          detail?: string
          device_class?: string | null
          id?: string
          kind?: string
          model?: string | null
          occurred_at?: string
          resolved?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      aria_interactions: {
        Row: {
          answer: string
          created_at: string
          device_class: string | null
          first_token_ms: number | null
          id: string
          latency_ms: number
          model: string
          question: string
          retried: boolean
          satisfied: boolean | null
          thread_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          device_class?: string | null
          first_token_ms?: number | null
          id?: string
          latency_ms?: number
          model: string
          question: string
          retried?: boolean
          satisfied?: boolean | null
          thread_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          device_class?: string | null
          first_token_ms?: number | null
          id?: string
          latency_ms?: number
          model?: string
          question?: string
          retried?: boolean
          satisfied?: boolean | null
          thread_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
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
      aria_learned_patterns: {
        Row: {
          confidence: number
          created_at: string
          domain: string
          hits: number
          id: string
          last_seen: string
          pattern_key: string
          pattern_value: string
          safety_passed: boolean
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          domain?: string
          hits?: number
          id?: string
          last_seen?: string
          pattern_key: string
          pattern_value: string
          safety_passed?: boolean
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          domain?: string
          hits?: number
          id?: string
          last_seen?: string
          pattern_key?: string
          pattern_value?: string
          safety_passed?: boolean
          user_id?: string
        }
        Relationships: []
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
          actor_id: string | null
          changes: Json
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          entity: string | null
          entity_id: string | null
          event_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          org_id: string
          resource_id: string | null
          resource_type: string | null
          route: string | null
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          entity?: string | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          org_id?: string
          resource_id?: string | null
          resource_type?: string | null
          route?: string | null
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          entity?: string | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          org_id?: string
          resource_id?: string | null
          resource_type?: string | null
          route?: string | null
          source?: string
          status?: string
          user_id?: string | null
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
      client_incidents: {
        Row: {
          category_ar: string
          closed_at: string | null
          created_at: string
          id: string
          incident_code: string
          is_simulation: boolean
          org_id: string
          priority: string
          reported_at: string
          reported_by: string | null
          site_id: string | null
          status: string
          tenant_id: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          category_ar: string
          closed_at?: string | null
          created_at?: string
          id?: string
          incident_code: string
          is_simulation?: boolean
          org_id: string
          priority: string
          reported_at?: string
          reported_by?: string | null
          site_id?: string | null
          status: string
          tenant_id: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          category_ar?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          incident_code?: string
          is_simulation?: boolean
          org_id?: string
          priority?: string
          reported_at?: string
          reported_by?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          title_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "client_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "client_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_personnel: {
        Row: {
          created_at: string
          employee_code: string
          full_name_ar: string
          id: string
          is_simulation: boolean
          org_id: string
          role_ar: string
          shift: string
          site_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_code: string
          full_name_ar: string
          id?: string
          is_simulation?: boolean
          org_id: string
          role_ar: string
          shift: string
          site_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_code?: string
          full_name_ar?: string
          id?: string
          is_simulation?: boolean
          org_id?: string
          role_ar?: string
          shift?: string
          site_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_personnel_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_personnel_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_personnel_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "client_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profile: {
        Row: {
          created_at: string
          id: string
          industry_ar: string
          is_default_view: boolean
          is_simulation: boolean
          name_ar: string
          name_en: string
          org_id: string
          region_ar: string
          ribbon_text_ar: string
          tenant_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry_ar: string
          is_default_view?: boolean
          is_simulation?: boolean
          name_ar: string
          name_en: string
          org_id: string
          region_ar: string
          ribbon_text_ar?: string
          tenant_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry_ar?: string
          is_default_view?: boolean
          is_simulation?: boolean
          name_ar?: string
          name_en?: string
          org_id?: string
          region_ar?: string
          ribbon_text_ar?: string
          tenant_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profile_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sites: {
        Row: {
          capacity_label_ar: string | null
          code: string
          created_at: string
          headcount: number
          id: string
          is_simulation: boolean
          name_ar: string
          org_id: string
          region_ar: string
          site_kind: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity_label_ar?: string | null
          code: string
          created_at?: string
          headcount?: number
          id?: string
          is_simulation?: boolean
          name_ar: string
          org_id: string
          region_ar: string
          site_kind: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity_label_ar?: string | null
          code?: string
          created_at?: string
          headcount?: number
          id?: string
          is_simulation?: boolean
          name_ar?: string
          org_id?: string
          region_ar?: string
          site_kind?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "client_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      client_work_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_at: string
          id: string
          is_simulation: boolean
          org_id: string
          priority: string
          site_id: string | null
          sla_hours: number
          source_incident_id: string | null
          status: string
          tenant_id: string
          title_ar: string
          updated_at: string
          wo_code: string
          wo_type: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at: string
          id?: string
          is_simulation?: boolean
          org_id: string
          priority: string
          site_id?: string | null
          sla_hours: number
          source_incident_id?: string | null
          status: string
          tenant_id: string
          title_ar: string
          updated_at?: string
          wo_code: string
          wo_type: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          is_simulation?: boolean
          org_id?: string
          priority?: string
          site_id?: string | null
          sla_hours?: number
          source_incident_id?: string | null
          status?: string
          tenant_id?: string
          title_ar?: string
          updated_at?: string
          wo_code?: string
          wo_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "client_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_work_orders_source_incident_id_fkey"
            columns: ["source_incident_id"]
            isOneToOne: false
            referencedRelation: "client_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "client_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_budgets: {
        Row: {
          alert_threshold_pct: number
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          monthly_cap_usd: number
          org_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          alert_threshold_pct?: number
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          monthly_cap_usd: number
          org_id: string
          scope?: string
          updated_at?: string
        }
        Update: {
          alert_threshold_pct?: number
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          monthly_cap_usd?: number
          org_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_budgets_org_id_fkey"
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
          duration_ms: number | null
          error: string | null
          id: string
          inputs_json: Json
          metrics_json: Json
          occurred_at: string
          org_id: string
          outputs_json: Json
          payload_json: Json
          processed_at: string | null
          retry_count: number
          severity: string
          source: string
          status: string
          subject_id: string | null
          subject_type: string | null
          topic: string
        }
        Insert: {
          actor_id?: string | null
          correlation_id?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          inputs_json?: Json
          metrics_json?: Json
          occurred_at?: string
          org_id?: string
          outputs_json?: Json
          payload_json?: Json
          processed_at?: string | null
          retry_count?: number
          severity?: string
          source?: string
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          topic: string
        }
        Update: {
          actor_id?: string | null
          correlation_id?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          inputs_json?: Json
          metrics_json?: Json
          occurred_at?: string
          org_id?: string
          outputs_json?: Json
          payload_json?: Json
          processed_at?: string | null
          retry_count?: number
          severity?: string
          source?: string
          status?: string
          subject_id?: string | null
          subject_type?: string | null
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
      evolution_log: {
        Row: {
          applied_at: string
          id: string
          org_id: string
          proposal_id: string | null
          summary_ar: string
        }
        Insert: {
          applied_at?: string
          id?: string
          org_id?: string
          proposal_id?: string | null
          summary_ar: string
        }
        Update: {
          applied_at?: string
          id?: string
          org_id?: string
          proposal_id?: string | null
          summary_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "evolution_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_proposals: {
        Row: {
          agent_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description_ar: string | null
          id: string
          org_id: string
          priority: string
          status: string
          title_ar: string
          title_en: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description_ar?: string | null
          id?: string
          org_id?: string
          priority?: string
          status?: string
          title_ar: string
          title_en: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description_ar?: string | null
          id?: string
          org_id?: string
          priority?: string
          status?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_proposals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "intelligence_agents"
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
      hajj_kpi_snapshots: {
        Row: {
          active_alerts: number
          compliance_pct: number
          created_at: string
          field_staff: number
          id: string
          notes: string | null
          open_incidents: number
          org_id: string
          risk_level: string
          snapshot_at: string
          stations_online: number
          stations_total: number
          tasks_done: number
        }
        Insert: {
          active_alerts?: number
          compliance_pct?: number
          created_at?: string
          field_staff?: number
          id?: string
          notes?: string | null
          open_incidents?: number
          org_id?: string
          risk_level?: string
          snapshot_at?: string
          stations_online?: number
          stations_total?: number
          tasks_done?: number
        }
        Update: {
          active_alerts?: number
          compliance_pct?: number
          created_at?: string
          field_staff?: number
          id?: string
          notes?: string | null
          open_incidents?: number
          org_id?: string
          risk_level?: string
          snapshot_at?: string
          stations_online?: number
          stations_total?: number
          tasks_done?: number
        }
        Relationships: []
      }
      hajj_sites: {
        Row: {
          code: string
          created_at: string
          id: string
          lat: number
          lng: number
          name_ar: string
          name_en: string
          notes: string | null
          org_id: string
          staff_count: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name_ar: string
          name_en: string
          notes?: string | null
          org_id?: string
          staff_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name_ar?: string
          name_en?: string
          notes?: string | null
          org_id?: string
          staff_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hajj_stations: {
        Row: {
          code: string
          created_at: string
          id: string
          incidents_count: number
          kind: string
          name_ar: string
          name_en: string
          network: string
          org_id: string
          reports_count: number
          site_id: string
          staff_count: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          incidents_count?: number
          kind?: string
          name_ar: string
          name_en: string
          network?: string
          org_id?: string
          reports_count?: number
          site_id: string
          staff_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          incidents_count?: number
          kind?: string
          name_ar?: string
          name_en?: string
          network?: string
          org_id?: string
          reports_count?: number
          site_id?: string
          staff_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hajj_stations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "hajj_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      hajj_tasks: {
        Row: {
          assignee: string | null
          category: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          org_id: string
          priority: string
          reported_at: string
          started_at: string | null
          station_id: string | null
          status: string
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          priority?: string
          reported_at?: string
          started_at?: string | null
          station_id?: string | null
          status?: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          priority?: string
          reported_at?: string
          started_at?: string | null
          station_id?: string | null
          status?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hajj_tasks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "hajj_stations"
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
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          last_test_error: string | null
          last_test_status: string | null
          last_test_user: string | null
          last_tested_at: string | null
          notes: string | null
          org_id: string
          outlook_delta_link: string | null
          redirect_uris: string[]
          sharepoint_delta_link: string | null
          sync_interval_minutes: number
          sync_outlook_enabled: boolean
          sync_sharepoint_enabled: boolean
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
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_test_user?: string | null
          last_tested_at?: string | null
          notes?: string | null
          org_id?: string
          outlook_delta_link?: string | null
          redirect_uris?: string[]
          sharepoint_delta_link?: string | null
          sync_interval_minutes?: number
          sync_outlook_enabled?: boolean
          sync_sharepoint_enabled?: boolean
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
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_test_user?: string | null
          last_tested_at?: string | null
          notes?: string | null
          org_id?: string
          outlook_delta_link?: string | null
          redirect_uris?: string[]
          sharepoint_delta_link?: string | null
          sync_interval_minutes?: number
          sync_outlook_enabled?: boolean
          sync_sharepoint_enabled?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      integration_microsoft_sync_log: {
        Row: {
          created_at: string
          details: Json
          duration_ms: number | null
          error: string | null
          id: string
          items_count: number
          kind: string
          org_id: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error?: string | null
          id?: string
          items_count?: number
          kind: string
          org_id: string
          started_at?: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error?: string | null
          id?: string
          items_count?: number
          kind?: string
          org_id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      intelligence_agents: {
        Row: {
          created_at: string
          focus_area: string
          id: string
          name_ar: string
          name_en: string
          org_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          focus_area: string
          id?: string
          name_ar: string
          name_en: string
          org_id?: string
          role: string
          status?: string
        }
        Update: {
          created_at?: string
          focus_area?: string
          id?: string
          name_ar?: string
          name_en?: string
          org_id?: string
          role?: string
          status?: string
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
      learn_lesson_progress: {
        Row: {
          completed_at: string | null
          last_seen_at: string
          lesson_id: string
          quiz_best_score: number
          quiz_passed: boolean
          simulation_completed: boolean
          status: string
          user_id: string
          video_watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          last_seen_at?: string
          lesson_id: string
          quiz_best_score?: number
          quiz_passed?: boolean
          simulation_completed?: boolean
          status?: string
          user_id: string
          video_watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          last_seen_at?: string
          lesson_id?: string
          quiz_best_score?: number
          quiz_passed?: boolean
          simulation_completed?: boolean
          status?: string
          user_id?: string
          video_watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "learn_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learn_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_lessons: {
        Row: {
          aria_suggested_prompts: Json
          aria_system_prompt_ar: string
          aria_system_prompt_en: string
          category: string
          cover_url: string | null
          created_at: string
          id: string
          narration_ar: string
          narration_en: string
          objectives_ar: Json
          objectives_en: Json
          order_index: number
          published: boolean
          quiz_pass_score: number
          simulation_kind: string | null
          slug: string
          subtitle_ar: string
          subtitle_en: string
          summary_ar: string
          summary_en: string
          title_ar: string
          title_en: string
          updated_at: string
          video_duration_seconds: number
          video_url: string | null
        }
        Insert: {
          aria_suggested_prompts?: Json
          aria_system_prompt_ar?: string
          aria_system_prompt_en?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          narration_ar?: string
          narration_en?: string
          objectives_ar?: Json
          objectives_en?: Json
          order_index?: number
          published?: boolean
          quiz_pass_score?: number
          simulation_kind?: string | null
          slug: string
          subtitle_ar: string
          subtitle_en: string
          summary_ar: string
          summary_en: string
          title_ar: string
          title_en: string
          updated_at?: string
          video_duration_seconds?: number
          video_url?: string | null
        }
        Update: {
          aria_suggested_prompts?: Json
          aria_system_prompt_ar?: string
          aria_system_prompt_en?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          narration_ar?: string
          narration_en?: string
          objectives_ar?: Json
          objectives_en?: Json
          order_index?: number
          published?: boolean
          quiz_pass_score?: number
          simulation_kind?: string | null
          slug?: string
          subtitle_ar?: string
          subtitle_en?: string
          summary_ar?: string
          summary_en?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
          video_duration_seconds?: number
          video_url?: string | null
        }
        Relationships: []
      }
      learn_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          lesson_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          attempted_at?: string
          id?: string
          lesson_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learn_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learn_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation_ar: string
          explanation_en: string
          id: string
          lesson_id: string
          options_ar: Json
          options_en: Json
          order_index: number
          prompt_ar: string
          prompt_en: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation_ar?: string
          explanation_en?: string
          id?: string
          lesson_id: string
          options_ar: Json
          options_en: Json
          order_index?: number
          prompt_ar: string
          prompt_en: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation_ar?: string
          explanation_en?: string
          id?: string
          lesson_id?: string
          options_ar?: Json
          options_en?: Json
          order_index?: number
          prompt_ar?: string
          prompt_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "learn_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "learn_lessons"
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
      ms_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          duration_ms: number | null
          error: string | null
          id: string
          items_count: number | null
          org_id: string
          path: string | null
          service: string
          status: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error?: string | null
          id?: string
          items_count?: number | null
          org_id: string
          path?: string | null
          service: string
          status?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error?: string | null
          id?: string
          items_count?: number | null
          org_id?: string
          path?: string | null
          service?: string
          status?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ms_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ms_user_tokens: {
        Row: {
          access_token_ct: string
          access_token_iv: string
          access_token_tag: string
          created_at: string
          expires_at: string
          id: string
          last_refresh_at: string | null
          ms_account_id: string | null
          ms_upn: string | null
          refresh_token_ct: string | null
          refresh_token_iv: string | null
          refresh_token_tag: string | null
          scope: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ct: string
          access_token_iv: string
          access_token_tag: string
          created_at?: string
          expires_at: string
          id?: string
          last_refresh_at?: string | null
          ms_account_id?: string | null
          ms_upn?: string | null
          refresh_token_ct?: string | null
          refresh_token_iv?: string | null
          refresh_token_tag?: string | null
          scope?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ct?: string
          access_token_iv?: string
          access_token_tag?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_refresh_at?: string | null
          ms_account_id?: string | null
          ms_upn?: string | null
          refresh_token_ct?: string | null
          refresh_token_iv?: string | null
          refresh_token_tag?: string | null
          scope?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
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
      sap_connections: {
        Row: {
          auth_mode: string
          base_url: string
          client_id_ref: string | null
          client_secret_ref: string | null
          created_at: string
          created_by: string | null
          default_service: string | null
          enabled: boolean
          id: string
          label: string
          last_test_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          org_id: string
          password_ref: string | null
          token_url: string | null
          updated_at: string
          username_ref: string | null
        }
        Insert: {
          auth_mode: string
          base_url: string
          client_id_ref?: string | null
          client_secret_ref?: string | null
          created_at?: string
          created_by?: string | null
          default_service?: string | null
          enabled?: boolean
          id?: string
          label?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          org_id: string
          password_ref?: string | null
          token_url?: string | null
          updated_at?: string
          username_ref?: string | null
        }
        Update: {
          auth_mode?: string
          base_url?: string
          client_id_ref?: string | null
          client_secret_ref?: string | null
          created_at?: string
          created_by?: string | null
          default_service?: string | null
          enabled?: boolean
          id?: string
          label?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          org_id?: string
          password_ref?: string | null
          token_url?: string | null
          updated_at?: string
          username_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sap_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sap_sync_log: {
        Row: {
          connection_id: string | null
          created_at: string
          details: Json
          duration_ms: number | null
          entity: string
          error: string | null
          id: string
          items_count: number | null
          method: string
          org_id: string
          path: string | null
          status: number | null
          user_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          entity: string
          error?: string | null
          id?: string
          items_count?: number | null
          method?: string
          org_id: string
          path?: string | null
          status?: number | null
          user_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          entity?: string
          error?: string | null
          id?: string
          items_count?: number | null
          method?: string
          org_id?: string
          path?: string | null
          status?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sap_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sap_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sap_sync_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      sec_knowledge_articles: {
        Row: {
          body_ar: string | null
          body_en: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          doc_code: string
          embedding: string | null
          embedding_model: string | null
          escalation_level: string | null
          id: string
          keywords_ar: string[]
          keywords_en: string[]
          metadata: Json
          org_id: string | null
          owner: string | null
          priority: string | null
          procedure_ar: string | null
          procedure_en: string | null
          purpose_ar: string | null
          purpose_en: string | null
          related_agents: string[]
          related_forms: string[]
          related_policies: string[]
          related_workflows: string[]
          requirements_ar: string | null
          requirements_en: string | null
          responsibilities_ar: string | null
          responsibilities_en: string | null
          review_date: string | null
          risk_level: string | null
          scope_ar: string | null
          scope_en: string | null
          status: string
          summary_ar: string | null
          summary_en: string | null
          title_ar: string
          title_en: string
          updated_at: string
          version: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          doc_code: string
          embedding?: string | null
          embedding_model?: string | null
          escalation_level?: string | null
          id?: string
          keywords_ar?: string[]
          keywords_en?: string[]
          metadata?: Json
          org_id?: string | null
          owner?: string | null
          priority?: string | null
          procedure_ar?: string | null
          procedure_en?: string | null
          purpose_ar?: string | null
          purpose_en?: string | null
          related_agents?: string[]
          related_forms?: string[]
          related_policies?: string[]
          related_workflows?: string[]
          requirements_ar?: string | null
          requirements_en?: string | null
          responsibilities_ar?: string | null
          responsibilities_en?: string | null
          review_date?: string | null
          risk_level?: string | null
          scope_ar?: string | null
          scope_en?: string | null
          status?: string
          summary_ar?: string | null
          summary_en?: string | null
          title_ar: string
          title_en: string
          updated_at?: string
          version?: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          doc_code?: string
          embedding?: string | null
          embedding_model?: string | null
          escalation_level?: string | null
          id?: string
          keywords_ar?: string[]
          keywords_en?: string[]
          metadata?: Json
          org_id?: string | null
          owner?: string | null
          priority?: string | null
          procedure_ar?: string | null
          procedure_en?: string | null
          purpose_ar?: string | null
          purpose_en?: string | null
          related_agents?: string[]
          related_forms?: string[]
          related_policies?: string[]
          related_workflows?: string[]
          requirements_ar?: string | null
          requirements_en?: string | null
          responsibilities_ar?: string | null
          responsibilities_en?: string | null
          review_date?: string | null
          risk_level?: string | null
          scope_ar?: string | null
          scope_en?: string | null
          status?: string
          summary_ar?: string | null
          summary_en?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_knowledge_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sec_knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sec_knowledge_categories: {
        Row: {
          code: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          name_ar: string
          name_en: string
          org_id: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_ar: string
          name_en: string
          org_id?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          org_id?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      sec_knowledge_links: {
        Row: {
          article_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          relation: string
        }
        Insert: {
          article_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          relation?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          relation?: string
        }
        Relationships: [
          {
            foreignKeyName: "sec_knowledge_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "sec_knowledge_articles"
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
      secrets_rotation_log: {
        Row: {
          created_at: string
          id: string
          next_due_at: string | null
          notes: string | null
          rotated_at: string
          rotated_by: string | null
          secret_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          rotated_at?: string
          rotated_by?: string | null
          secret_name: string
        }
        Update: {
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          rotated_at?: string
          rotated_by?: string | null
          secret_name?: string
        }
        Relationships: []
      }
      sim_buses: {
        Row: {
          capacity: number
          created_at: string
          driver_employee_id: string | null
          id: string
          metadata: Json
          next_service_at: string | null
          org_id: string
          plate: string
          route_code: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_employee_id?: string | null
          id?: string
          metadata?: Json
          next_service_at?: string | null
          org_id: string
          plate: string
          route_code?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_employee_id?: string | null
          id?: string
          metadata?: Json
          next_service_at?: string | null
          org_id?: string
          plate?: string
          route_code?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_buses_driver_employee_id_fkey"
            columns: ["driver_employee_id"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_corrective_actions: {
        Row: {
          action: string
          created_at: string
          due_at: string | null
          id: string
          metadata: Json
          org_id: string
          owner_employee: string | null
          priority: string
          ref: string
          source_id: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json
          org_id: string
          owner_employee?: string | null
          priority?: string
          ref: string
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          owner_employee?: string | null
          priority?: string
          ref?: string
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_corrective_actions_owner_employee_fkey"
            columns: ["owner_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_daily_ops: {
        Row: {
          created_at: string
          day: string
          headcount: number
          id: string
          incidents_open: number
          kpi_json: Json
          metadata: Json
          org_id: string
          patrols_done: number
          patrols_planned: number
          permits_active: number
          shift: string
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: string
          headcount?: number
          id?: string
          incidents_open?: number
          kpi_json?: Json
          metadata?: Json
          org_id: string
          patrols_done?: number
          patrols_planned?: number
          permits_active?: number
          shift?: string
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string
          headcount?: number
          id?: string
          incidents_open?: number
          kpi_json?: Json
          metadata?: Json
          org_id?: string
          patrols_done?: number
          patrols_planned?: number
          permits_active?: number
          shift?: string
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sim_departments: {
        Row: {
          budget: number | null
          code: string
          created_at: string
          head_employee_id: string | null
          headcount_target: number | null
          id: string
          metadata: Json
          name_ar: string
          name_en: string
          org_id: string
          parent_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code: string
          created_at?: string
          head_employee_id?: string | null
          headcount_target?: number | null
          id?: string
          metadata?: Json
          name_ar: string
          name_en: string
          org_id: string
          parent_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string
          created_at?: string
          head_employee_id?: string | null
          headcount_target?: number | null
          id?: string
          metadata?: Json
          name_ar?: string
          name_en?: string
          org_id?: string
          parent_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_departments_head_fk"
            columns: ["head_employee_id"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sim_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_employees: {
        Row: {
          contact: Json
          created_at: string
          dept_id: string | null
          employee_no: string
          full_name_ar: string
          full_name_en: string
          grade: string | null
          hire_date: string | null
          id: string
          manager_id: string | null
          metadata: Json
          org_id: string
          role: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact?: Json
          created_at?: string
          dept_id?: string | null
          employee_no: string
          full_name_ar: string
          full_name_en: string
          grade?: string | null
          hire_date?: string | null
          id?: string
          manager_id?: string | null
          metadata?: Json
          org_id: string
          role: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: Json
          created_at?: string
          dept_id?: string | null
          employee_no?: string
          full_name_ar?: string
          full_name_en?: string
          grade?: string | null
          hire_date?: string | null
          id?: string
          manager_id?: string | null
          metadata?: Json
          org_id?: string
          role?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_employees_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "sim_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_history: {
        Row: {
          action: string
          actor_employee: string | null
          at: string
          changes_json: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          action: string
          actor_employee?: string | null
          at?: string
          changes_json?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          org_id: string
        }
        Update: {
          action?: string
          actor_employee?: string | null
          at?: string
          changes_json?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_history_actor_employee_fkey"
            columns: ["actor_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_inspections: {
        Row: {
          building_id: string | null
          completed_at: string | null
          created_at: string
          findings_count: number
          id: string
          inspector_employee: string | null
          kind: string
          metadata: Json
          org_id: string
          priority: string
          ref: string
          scheduled_at: string
          score: number | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          completed_at?: string | null
          created_at?: string
          findings_count?: number
          id?: string
          inspector_employee?: string | null
          kind: string
          metadata?: Json
          org_id: string
          priority?: string
          ref: string
          scheduled_at: string
          score?: number | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          completed_at?: string | null
          created_at?: string
          findings_count?: number
          id?: string
          inspector_employee?: string | null
          kind?: string
          metadata?: Json
          org_id?: string
          priority?: string
          ref?: string
          scheduled_at?: string
          score?: number | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_inspections_inspector_employee_fkey"
            columns: ["inspector_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_meetings: {
        Row: {
          attendees: Json
          created_at: string
          dept_id: string | null
          duration_min: number
          id: string
          kind: string
          location: string | null
          metadata: Json
          minutes_url: string | null
          org_id: string
          organizer_employee: string | null
          priority: string
          ref: string
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: Json
          created_at?: string
          dept_id?: string | null
          duration_min?: number
          id?: string
          kind?: string
          location?: string | null
          metadata?: Json
          minutes_url?: string | null
          org_id: string
          organizer_employee?: string | null
          priority?: string
          ref: string
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: Json
          created_at?: string
          dept_id?: string | null
          duration_min?: number
          id?: string
          kind?: string
          location?: string | null
          metadata?: Json
          minutes_url?: string | null
          org_id?: string
          organizer_employee?: string | null
          priority?: string
          ref?: string
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_meetings_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "sim_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_meetings_organizer_employee_fkey"
            columns: ["organizer_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_near_misses: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          org_id: string
          priority: string
          ref: string
          reported_at: string
          reported_by_employee: string | null
          root_cause: string | null
          severity_potential: string
          site_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          org_id: string
          priority?: string
          ref: string
          reported_at?: string
          reported_by_employee?: string | null
          root_cause?: string | null
          severity_potential?: string
          site_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          priority?: string
          ref?: string
          reported_at?: string
          reported_by_employee?: string | null
          root_cause?: string | null
          severity_potential?: string
          site_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_near_misses_reported_by_employee_fkey"
            columns: ["reported_by_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          org_id: string
          priority: string
          read_at: string | null
          severity: string
          status: string
          target_employee: string | null
          target_user_id: string | null
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          org_id: string
          priority?: string
          read_at?: string | null
          severity?: string
          status?: string
          target_employee?: string | null
          target_user_id?: string | null
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          org_id?: string
          priority?: string
          read_at?: string | null
          severity?: string
          status?: string
          target_employee?: string | null
          target_user_id?: string | null
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_notifications_target_employee_fkey"
            columns: ["target_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_risks: {
        Row: {
          category: string | null
          created_at: string
          id: string
          impact: number
          inspection_id: string | null
          likelihood: number
          metadata: Json
          mitigation: string | null
          org_id: string
          owner_employee: string | null
          priority: string
          ref: string
          score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          impact?: number
          inspection_id?: string | null
          likelihood?: number
          metadata?: Json
          mitigation?: string | null
          org_id: string
          owner_employee?: string | null
          priority?: string
          ref: string
          score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          impact?: number
          inspection_id?: string | null
          likelihood?: number
          metadata?: Json
          mitigation?: string | null
          org_id?: string
          owner_employee?: string | null
          priority?: string
          ref?: string
          score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_risks_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "sim_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_risks_owner_employee_fkey"
            columns: ["owner_employee"]
            isOneToOne: false
            referencedRelation: "sim_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string
          id: string
          is_simulation: boolean
          org_id: string
          requester: string
          status: string
          topic_ar: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          created_at?: string
          id?: string
          is_simulation?: boolean
          org_id?: string
          requester: string
          status?: string
          topic_ar: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          id?: string
          is_simulation?: boolean
          org_id?: string
          requester?: string
          status?: string
          topic_ar?: string
          updated_at?: string
        }
        Relationships: []
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
      urgent_tasks: {
        Row: {
          created_at: string
          department: string
          due_at: string | null
          id: string
          is_simulation: boolean
          org_id: string
          owner_name: string | null
          priority: string
          sla_hours: number | null
          status: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          due_at?: string | null
          id?: string
          is_simulation?: boolean
          org_id?: string
          owner_name?: string | null
          priority: string
          sla_hours?: number | null
          status?: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          due_at?: string | null
          id?: string
          is_simulation?: boolean
          org_id?: string
          owner_name?: string | null
          priority?: string
          sla_hours?: number | null
          status?: string
          title_ar?: string
          updated_at?: string
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
      check_rate_limit: {
        Args: {
          _bucket_key: string
          _max_requests: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_email_unsubscribe_tokens: { Args: never; Returns: number }
      current_org_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      emit_daily_kpi_schedule: { Args: never; Returns: undefined }
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
      microsoft_sync_dispatch: { Args: never; Returns: number }
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
      runtime_cleanup_stale_executions: { Args: never; Returns: Json }
      sec_kb_search: {
        Args: { _category_code?: string; _limit?: number; _query: string }
        Returns: {
          category_code: string
          doc_code: string
          id: string
          priority: string
          risk_level: string
          similarity: number
          summary_ar: string
          summary_en: string
          title_ar: string
          title_en: string
        }[]
      }
      set_microsoft_sync_secret: {
        Args: { _secret: string }
        Returns: undefined
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
