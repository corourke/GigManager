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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string | null
          context: Json
          entity_id: string
          entity_type: string
          event_type: string
          gig_id: string | null
          id: string
          occurred_at: string
          organization_id: string | null
        }
        Insert: {
          actor_id?: string | null
          context?: Json
          entity_id: string
          entity_type: string
          event_type: string
          gig_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
        }
        Update: {
          actor_id?: string | null
          context?: Json
          entity_id?: string
          entity_type?: string
          event_type?: string
          gig_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquisition_date: string
          category: string
          created_at: string
          created_by: string
          dep_method: string | null
          description: string | null
          id: string
          insurance_class: string | null
          insurance_policy_added: boolean
          item_cost: number | null
          item_price: number | null
          liquidation_amt: number | null
          manufacturer_model: string
          organization_id: string
          purchase_id: string | null
          quantity: number | null
          replacement_value: number | null
          retired_on: string | null
          serial_number: string | null
          service_life: number | null
          status: string
          sub_category: string | null
          tag_number: string | null
          type: string | null
          updated_at: string
          updated_by: string
          vendor: string | null
        }
        Insert: {
          acquisition_date: string
          category: string
          created_at?: string
          created_by: string
          dep_method?: string | null
          description?: string | null
          id?: string
          insurance_class?: string | null
          insurance_policy_added?: boolean
          item_cost?: number | null
          item_price?: number | null
          liquidation_amt?: number | null
          manufacturer_model: string
          organization_id: string
          purchase_id?: string | null
          quantity?: number | null
          replacement_value?: number | null
          retired_on?: string | null
          serial_number?: string | null
          service_life?: number | null
          status?: string
          sub_category?: string | null
          tag_number?: string | null
          type?: string | null
          updated_at?: string
          updated_by: string
          vendor?: string | null
        }
        Update: {
          acquisition_date?: string
          category?: string
          created_at?: string
          created_by?: string
          dep_method?: string | null
          description?: string | null
          id?: string
          insurance_class?: string | null
          insurance_policy_added?: boolean
          item_cost?: number | null
          item_price?: number | null
          liquidation_amt?: number | null
          manufacturer_model?: string
          organization_id?: string
          purchase_id?: string | null
          quantity?: number | null
          replacement_value?: number | null
          retired_on?: string | null
          serial_number?: string | null
          service_life?: number | null
          status?: string
          sub_category?: string | null
          tag_number?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_attachments: {
        Row: {
          attachment_id: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          attachment_id: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          attachment_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_financials: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["fin_category"] | null
          counterparty_id: string | null
          created_at: string
          created_by: string
          currency: string
          date: string
          description: string | null
          due_date: string | null
          external_entity_name: string | null
          gig_id: string
          id: string
          mileage: number | null
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          purchase_id: string | null
          reference_number: string | null
          staff_assignment_id: string | null
          type: Database["public"]["Enums"]["fin_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["fin_category"] | null
          counterparty_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          date: string
          description?: string | null
          due_date?: string | null
          external_entity_name?: string | null
          gig_id: string
          id?: string
          mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          purchase_id?: string | null
          reference_number?: string | null
          staff_assignment_id?: string | null
          type: Database["public"]["Enums"]["fin_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["fin_category"] | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          description?: string | null
          due_date?: string | null
          external_entity_name?: string | null
          gig_id?: string
          id?: string
          mileage?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          purchase_id?: string | null
          reference_number?: string | null
          staff_assignment_id?: string | null
          type?: Database["public"]["Enums"]["fin_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_bids_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_bids_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_financials_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_financials_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_financials_staff_assignment_id_fkey"
            columns: ["staff_assignment_id"]
            isOneToOne: false
            referencedRelation: "gig_staff_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_financials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_kit_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          gig_id: string
          id: string
          kit_id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          gig_id: string
          id?: string
          kit_id: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          gig_id?: string
          id?: string
          kit_id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_kit_assignments_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_kit_assignments_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_kit_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_participants: {
        Row: {
          gig_id: string
          id: string
          notes: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
        }
        Insert: {
          gig_id: string
          id?: string
          notes?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
        }
        Update: {
          gig_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
        }
        Relationships: [
          {
            foreignKeyName: "gig_participants_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_schedule_entries: {
        Row: {
          act_participant_id: string | null
          activity_type: Database["public"]["Enums"]["schedule_activity_type"]
          created_at: string
          end_time: string | null
          gig_id: string
          id: string
          label: string | null
          notes: string | null
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          act_participant_id?: string | null
          activity_type: Database["public"]["Enums"]["schedule_activity_type"]
          created_at?: string
          end_time?: string | null
          gig_id: string
          id?: string
          label?: string | null
          notes?: string | null
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          act_participant_id?: string | null
          activity_type?: Database["public"]["Enums"]["schedule_activity_type"]
          created_at?: string
          end_time?: string | null
          gig_id?: string
          id?: string
          label?: string | null
          notes?: string | null
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_schedule_entries_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_schedule_entries_act_participant_id_fkey"
            columns: ["act_participant_id"]
            isOneToOne: false
            referencedRelation: "gig_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_staff_assignments: {
        Row: {
          assigned_at: string
          completed_at: string | null
          confirmed_at: string | null
          fee: number | null
          gig_financial_id: string | null
          id: string
          notes: string | null
          rate: number | null
          slot_id: string
          status: string
          units_completed: number | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          confirmed_at?: string | null
          fee?: number | null
          gig_financial_id?: string | null
          id?: string
          notes?: string | null
          rate?: number | null
          slot_id: string
          status: string
          units_completed?: number | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          confirmed_at?: string | null
          fee?: number | null
          gig_financial_id?: string | null
          id?: string
          notes?: string | null
          rate?: number | null
          slot_id?: string
          status?: string
          units_completed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_staff_assignments_gig_financial_id_fkey"
            columns: ["gig_financial_id"]
            isOneToOne: false
            referencedRelation: "gig_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_staff_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "gig_staff_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_staff_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_staff_slots: {
        Row: {
          created_at: string
          gig_id: string
          id: string
          notes: string | null
          organization_id: string | null
          required_count: number
          staff_role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          required_count?: number
          staff_role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          required_count?: number
          staff_role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_staff_slots_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_staff_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_staff_slots_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_sync_status: {
        Row: {
          created_at: string
          gig_id: string
          google_event_id: string | null
          id: string
          last_synced_at: string | null
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_sync_status_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_sync_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          created_at: string
          created_by: string
          end: string
          hierarchy_depth: number
          id: string
          notes: string | null
          parent_gig_id: string | null
          start: string
          status: Database["public"]["Enums"]["gig_status"]
          tags: string[] | null
          timezone: string
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end: string
          hierarchy_depth?: number
          id?: string
          notes?: string | null
          parent_gig_id?: string | null
          start: string
          status: Database["public"]["Enums"]["gig_status"]
          tags?: string[] | null
          timezone: string
          title: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end?: string
          hierarchy_depth?: number
          id?: string
          notes?: string | null
          parent_gig_id?: string | null
          start?: string
          status?: Database["public"]["Enums"]["gig_status"]
          tags?: string[] | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_parent_gig_id_fkey"
            columns: ["parent_gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_tracking: {
        Row: {
          asset_id: string | null
          created_at: string
          gig_id: string
          id: string
          kit_id: string | null
          location: string | null
          notes: string | null
          organization_id: string
          scanned_at: string
          scanned_by: string | null
          status: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          gig_id: string
          id?: string
          kit_id?: string | null
          location?: string | null
          notes?: string | null
          organization_id: string
          scanned_at?: string
          scanned_by?: string | null
          status: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          gig_id?: string
          id?: string
          kit_id?: string | null
          location?: string | null
          notes?: string | null
          organization_id?: string
          scanned_at?: string
          scanned_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tracking_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tracking_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tracking_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          status?: string
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_assets: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          kit_id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          kit_id: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          kit_id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_assets_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_container: boolean
          name: string
          organization_id: string
          rental_value: number | null
          tag_number: string | null
          tags: string[] | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_container?: boolean
          name: string
          organization_id: string
          rental_value?: number | null
          tag_number?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_container?: boolean
          name?: string
          organization_id?: string
          rental_value?: number | null
          tag_number?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_store_de012ad4: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          default_staff_role_id: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          default_staff_role_id?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          default_staff_role_id?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_default_staff_role_id_fkey"
            columns: ["default_staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          allowed_domains: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          phone_number: string | null
          postal_code: string | null
          roles: Database["public"]["Enums"]["organization_role"][]
          state: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          allowed_domains?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phone_number?: string | null
          postal_code?: string | null
          roles: Database["public"]["Enums"]["organization_role"][]
          state?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          allowed_domains?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          postal_code?: string | null
          roles?: Database["public"]["Enums"]["organization_role"][]
          state?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          asset_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gig_id: string | null
          id: string
          item_cost: number | null
          item_price: number | null
          line_amount: number | null
          line_cost: number | null
          organization_id: string
          parent_id: string | null
          payment_method: string | null
          purchase_date: string | null
          quantity: number | null
          row_type: string
          sub_category: string | null
          total_inv_amount: number | null
          updated_at: string
          updated_by: string | null
          vendor: string | null
        }
        Insert: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gig_id?: string | null
          id?: string
          item_cost?: number | null
          item_price?: number | null
          line_amount?: number | null
          line_cost?: number | null
          organization_id: string
          parent_id?: string | null
          payment_method?: string | null
          purchase_date?: string | null
          quantity?: number | null
          row_type: string
          sub_category?: string | null
          total_inv_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Update: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gig_id?: string | null
          id?: string
          item_cost?: number | null
          item_price?: number | null
          line_amount?: number | null
          line_cost?: number | null
          organization_id?: string
          parent_id?: string | null
          payment_method?: string | null
          purchase_date?: string | null
          quantity?: number | null
          row_type?: string
          sub_category?: string | null
          total_inv_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string
          public_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          public_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_google_calendar_settings: {
        Row: {
          access_token: string
          calendar_id: string
          calendar_name: string | null
          created_at: string
          id: string
          is_enabled: boolean
          refresh_token: string
          sync_filters: Json | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          refresh_token: string
          sync_filters?: Json | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          refresh_token?: string
          sync_filters?: Json | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_google_calendar_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          postal_code: string | null
          role_hint: string | null
          state: string | null
          timezone: string | null
          updated_at: string
          user_status: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          postal_code?: string | null
          role_hint?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          user_status?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          postal_code?: string | null
          role_hint?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          user_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_pending_user_to_active: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: Json
      }
      log_activity: {
        Args: {
          p_organization_id: string | null
          p_event_type: string
          p_entity_type: string
          p_entity_id: string
          p_gig_id: string | null
          p_context: Json
        }
        Returns: string
      }
      create_gig_complex: {
        Args: { p_gig_data: Json; p_participants?: Json; p_staff_slots?: Json }
        Returns: {
          id: string
        }[]
      }
      create_purchase_transaction_v1: {
        Args: { p_assets: Json[]; p_header: Json; p_items: Json[] }
        Returns: Json
      }
      get_complete_user_data: { Args: { user_uuid: string }; Returns: Json }
      get_user_email: { Args: { user_uuid: string }; Returns: string }
      get_user_ids_in_same_orgs: {
        Args: { user_uuid: string }
        Returns: {
          member_user_id: string
        }[]
      }
      get_user_organizations_secure: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          organization: Json
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_user_profile_secure: {
        Args: { user_uuid: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          postal_code: string | null
          role_hint: string | null
          state: string | null
          timezone: string | null
          updated_at: string
          user_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role_in_org: {
        Args: { org_id: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      invite_user_to_organization:
        | {
            Args: {
              p_email: string
              p_first_name?: string
              p_last_name?: string
              p_organization_id: string
              p_role: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_email: string
              p_first_name?: string
              p_inviter_id?: string
              p_last_name?: string
              p_organization_id: string
              p_role: string
            }
            Returns: Json
          }
      reclassify_expense_as_asset: {
        Args: { p_purchase_item_id: string }
        Returns: Json
      }
      search_users_secure: {
        Args: { search_text: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          postal_code: string | null
          role_hint: string | null
          state: string | null
          timezone: string | null
          updated_at: string
          user_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_asset_status: {
        Args: { p_asset_id: string; p_status: string }
        Returns: undefined
      }
      user_can_manage_gig: {
        Args: { gig_id: string; user_uuid: string }
        Returns: boolean
      }
      user_has_access_to_gig: {
        Args: { gig_id: string; user_uuid: string }
        Returns: boolean
      }
      user_is_admin: { Args: { user_uuid: string }; Returns: boolean }
      user_is_admin_of_gig: {
        Args: { gig_id: string; user_uuid: string }
        Returns: boolean
      }
      user_is_admin_of_org: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      user_is_admin_or_manager_of_org: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      user_is_member_of_org: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      user_organization_ids: {
        Args: { user_uuid: string }
        Returns: {
          organization_id: string
        }[]
      }
    }
    Enums: {
      fin_category:
        | "Advertising"
        | "Car and truck expenses"
        | "Commissions and fees"
        | "Contract labor"
        | "Depreciation"
        | "Insurance"
        | "Legal and professional services"
        | "Office expense"
        | "Rent or lease"
        | "Repairs and maintenance"
        | "Supplies"
        | "Taxes and licenses"
        | "Travel"
        | "Meals"
        | "Utilities"
        | "Wages"
        | "Other expenses"
      fin_type:
        | "Bid Submitted"
        | "Bid Accepted"
        | "Bid Rejected"
        | "Contract Submitted"
        | "Contract Revised"
        | "Contract Signed"
        | "Contract Rejected"
        | "Contract Cancelled"
        | "Contract Settled"
        | "Sub-Contract Submitted"
        | "Sub-Contract Revised"
        | "Sub-Contract Signed"
        | "Sub-Contract Rejected"
        | "Sub-Contract Cancelled"
        | "Sub-Contract Settled"
        | "Deposit Received"
        | "Deposit Sent"
        | "Deposit Refunded"
        | "Payment Sent"
        | "Payment Received"
        | "Expense Incurred"
        | "Expense Reimbursed"
        | "Invoice Issued"
        | "Invoice Settled"
        | "Informal Terms"
      gig_status:
        | "DateHold"
        | "Proposed"
        | "Booked"
        | "Completed"
        | "Cancelled"
        | "Settled"
      organization_role:
        | "Production"
        | "Sound"
        | "Lighting"
        | "Staging"
        | "Rentals"
        | "Venue"
        | "Act"
        | "Agency"
      schedule_activity_type:
        | "Load-In"
        | "Soundcheck"
        | "Rehearsal"
        | "Set"
        | "Intermission"
        | "Load-Out"
        | "Other"
      sync_status: "pending" | "synced" | "failed" | "updated" | "removed"
      user_role: "Admin" | "Manager" | "Staff" | "Viewer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      fin_category: [
        "Advertising",
        "Car and truck expenses",
        "Commissions and fees",
        "Contract labor",
        "Depreciation",
        "Insurance",
        "Legal and professional services",
        "Office expense",
        "Rent or lease",
        "Repairs and maintenance",
        "Supplies",
        "Taxes and licenses",
        "Travel",
        "Meals",
        "Utilities",
        "Wages",
        "Other expenses",
      ],
      fin_type: [
        "Bid Submitted",
        "Bid Accepted",
        "Bid Rejected",
        "Contract Submitted",
        "Contract Revised",
        "Contract Signed",
        "Contract Rejected",
        "Contract Cancelled",
        "Contract Settled",
        "Sub-Contract Submitted",
        "Sub-Contract Revised",
        "Sub-Contract Signed",
        "Sub-Contract Rejected",
        "Sub-Contract Cancelled",
        "Sub-Contract Settled",
        "Deposit Received",
        "Deposit Sent",
        "Deposit Refunded",
        "Payment Sent",
        "Payment Received",
        "Expense Incurred",
        "Expense Reimbursed",
        "Invoice Issued",
        "Invoice Settled",
        "Informal Terms",
      ],
      gig_status: [
        "DateHold",
        "Proposed",
        "Booked",
        "Completed",
        "Cancelled",
        "Settled",
      ],
      organization_role: [
        "Production",
        "Sound",
        "Lighting",
        "Staging",
        "Rentals",
        "Venue",
        "Act",
        "Agency",
      ],
      sync_status: ["pending", "synced", "failed", "updated", "removed"],
      user_role: ["Admin", "Manager", "Staff", "Viewer"],
    },
  },
} as const
