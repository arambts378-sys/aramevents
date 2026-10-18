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
      access_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          ends_at: string | null
          id: string
          registration_id: string
          starts_at: string | null
          zone_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          registration_id: string
          starts_at?: string | null
          zone_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          registration_id?: string
          starts_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_assignments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "access_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      access_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_type: string
          rule_value: Json
          updated_at: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_type: string
          rule_value?: Json
          updated_at?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_type?: string
          rule_value?: Json
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "access_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      access_zones: {
        Row: {
          allow_reentry: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          starts_at: string | null
          updated_at: string
          zone_type: string
        }
        Insert: {
          allow_reentry?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          starts_at?: string | null
          updated_at?: string
          zone_type: string
        }
        Update: {
          allow_reentry?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          starts_at?: string | null
          updated_at?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendee_imports: {
        Row: {
          created_at: string
          duplicate_count: number
          error_count: number
          event_id: string
          existing_count: number
          file_name: string
          id: string
          imported_by: string
          imported_count: number
          total_rows: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duplicate_count?: number
          error_count?: number
          event_id: string
          existing_count?: number
          file_name: string
          id?: string
          imported_by: string
          imported_count?: number
          total_rows?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          duplicate_count?: number
          error_count?: number
          event_id?: string
          existing_count?: number
          file_name?: string
          id?: string
          imported_by?: string
          imported_count?: number
          total_rows?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendee_imports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendee_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_integrations: {
        Row: {
          config: Json
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_integrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_people: {
        Row: {
          created_at: string
          event_id: string
          id: string
          person_id: string
          person_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          person_id: string
          person_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          person_id?: string
          person_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_people_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_settings: {
        Row: {
          capacity: number | null
          confirmation_message: string | null
          created_at: string
          description: string | null
          event_id: string
          is_enabled: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          confirmation_message?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          is_enabled?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          confirmation_message?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          is_enabled?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_speakers: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number | null
          event_person_id: string
          headline: string | null
          is_featured: boolean | null
          linkedin_url: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          event_person_id: string
          headline?: string | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          event_person_id?: string
          headline?: string | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_speakers_event_person_id_fkey"
            columns: ["event_person_id"]
            isOneToOne: true
            referencedRelation: "event_people"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          end_time: string
          flyer_url: string | null
          format: string
          id: string
          location: string | null
          name: string
          slug: string
          start_date: string
          start_time: string
          status: string
          timezone: string
          type: string
          updated_at: string
          website: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          end_time: string
          flyer_url?: string | null
          format: string
          id?: string
          location?: string | null
          name: string
          slug: string
          start_date: string
          start_time: string
          status: string
          timezone: string
          type: string
          updated_at?: string
          website?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          end_time?: string
          flyer_url?: string | null
          format?: string
          id?: string
          location?: string | null
          name?: string
          slug?: string
          start_date?: string
          start_time?: string
          status?: string
          timezone?: string
          type?: string
          updated_at?: string
          website?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          attempts: number
          created_at: string
          event_id: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_attempt_at: string | null
          payload: Json
          processed_at: string | null
          provider: string
          registration_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json
          processed_at?: string | null
          provider: string
          registration_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          registration_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_jobs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string | null
          organization: string | null
          phone: string | null
          profile_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name?: string | null
          organization?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string | null
          organization?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_credentials: {
        Row: {
          created_at: string
          credential_prefix: string | null
          credential_token_hash: string
          event_id: string
          expires_at: string | null
          id: string
          issued_at: string
          last_used_at: string | null
          registration_id: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_prefix?: string | null
          credential_token_hash: string
          event_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          last_used_at?: string | null
          registration_id: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_prefix?: string | null
          credential_token_hash?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          last_used_at?: string | null
          registration_id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_credentials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_credentials_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          cancelled_at: string | null
          confirmation_status: string
          confirmed_at: string | null
          created_at: string
          event_id: string
          event_person_id: string
          id: string
          metadata: Json
          person_id: string
          registered_at: string
          registration_number: string
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          event_person_id: string
          id?: string
          metadata?: Json
          person_id: string
          registered_at?: string
          registration_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          event_person_id?: string
          id?: string
          metadata?: Json
          person_id?: string
          registered_at?: string
          registration_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_person_id_fkey"
            columns: ["event_person_id"]
            isOneToOne: false
            referencedRelation: "event_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_events: {
        Row: {
          action: string
          actor_user_id: string | null
          category: string
          correlation_id: string
          error_code: string | null
          id: string
          message: string
          metadata: Json
          occurred_at: string
          outcome: string
          resource_id: string | null
          resource_type: string | null
          severity: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          category: string
          correlation_id?: string
          error_code?: string | null
          id?: string
          message: string
          metadata?: Json
          occurred_at?: string
          outcome: string
          resource_id?: string | null
          resource_type?: string | null
          severity: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          category?: string
          correlation_id?: string
          error_code?: string | null
          id?: string
          message?: string
          metadata?: Json
          occurred_at?: string
          outcome?: string
          resource_id?: string | null
          resource_type?: string | null
          severity?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_activity_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_integration_jobs: {
        Args: { p_limit: number; p_processor_id: string }
        Returns: {
          attempts: number
          created_at: string
          event_id: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_attempt_at: string | null
          payload: Json
          processed_at: string | null
          provider: string
          registration_id: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_workspace_from_event: {
        Args: { p_event_id: string }
        Returns: string
      }
      get_workspace_from_event_person: {
        Args: { p_event_person_id: string }
        Returns: string
      }
      has_permission: {
        Args: { required_permission: string; workspace_id: string }
        Returns: boolean
      }
      import_attendees: {
        Args: {
          p_event_id: string
          p_file_name: string
          p_rows: Json
          p_workspace_id: string
        }
        Returns: Json
      }
      is_workspace_member: { Args: { workspace_id: string }; Returns: boolean }
      has_platform_permission: { Args: { p_permission: string }; Returns: boolean }
      list_platform_customers: {
        Args: {
          p_page: number
          p_page_size: number
          p_plan: string | null
          p_search: string | null
          p_sort: string
          p_sort_direction: string
        }
        Returns: Json
      }
      get_platform_customer_detail: {
        Args: {
          p_event_page: number
          p_member_page: number
          p_page_size: number
          p_workspace_id: string
        }
        Returns: Json
      }
      list_platform_activity: {
        Args: {
          p_action: string | null
          p_category: string | null
          p_correlation_id: string | null
          p_from: string | null
          p_outcome: string | null
          p_page: number
          p_page_size: number
          p_search: string | null
          p_severity: string | null
          p_to: string | null
          p_workspace_id: string | null
        }
        Returns: Json
      }
      submit_event_registration: {
        Args: { p_event_id: string; p_person_data: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
