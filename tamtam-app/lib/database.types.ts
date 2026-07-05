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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_cache: {
        Row: {
          cost_usd: number | null
          created_at: string
          id: string
          input_hash: string
          input_tokens: number | null
          model_used: string
          output_tokens: number | null
          result: Json
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_hash: string
          input_tokens?: number | null
          model_used: string
          output_tokens?: number | null
          result: Json
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_hash?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          result?: Json
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          brand_id: string
          call_count: number | null
          created_at: string
          id: string
          month: string
          total_cost_usd: number | null
        }
        Insert: {
          brand_id: string
          call_count?: number | null
          created_at?: string
          id?: string
          month: string
          total_cost_usd?: number | null
        }
        Update: {
          brand_id?: string
          call_count?: number | null
          created_at?: string
          id?: string
          month?: string
          total_cost_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "ai_usage_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_commissions: {
        Row: {
          ambassador_id: string
          campaign_budget: number
          campaign_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          paid_at: string | null
          referral_id: string | null
          status: string | null
        }
        Insert: {
          ambassador_id: string
          campaign_budget: number
          campaign_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          ambassador_id?: string
          campaign_budget?: number
          campaign_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_commissions_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "ambassador_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_referrals: {
        Row: {
          ambassador_id: string
          brand_user_id: string
          first_campaign_at: string | null
          id: string
          referral_code: string
          signed_up_at: string | null
          status: string | null
          total_campaigns: number | null
          total_commission_earned: number | null
        }
        Insert: {
          ambassador_id: string
          brand_user_id: string
          first_campaign_at?: string | null
          id?: string
          referral_code: string
          signed_up_at?: string | null
          status?: string | null
          total_campaigns?: number | null
          total_commission_earned?: number | null
        }
        Update: {
          ambassador_id?: string
          brand_user_id?: string
          first_campaign_at?: string | null
          id?: string
          referral_code?: string
          signed_up_at?: string | null
          status?: string | null
          total_campaigns?: number | null
          total_commission_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_referrals_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_referrals_brand_user_id_fkey"
            columns: ["brand_user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "ambassador_referrals_brand_user_id_fkey"
            columns: ["brand_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          referral_code: string
          status: string | null
          total_earned: number | null
          total_paid: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          referral_code: string
          status?: string | null
          total_earned?: number | null
          total_paid?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          referral_code?: string
          status?: string | null
          total_earned?: number | null
          total_paid?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassadors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "ambassadors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          block_type: string | null
          blocked_by: string | null
          carrier_ip: boolean | null
          click_count: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          block_type?: string | null
          blocked_by?: string | null
          carrier_ip?: boolean | null
          click_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          block_type?: string | null
          blocked_by?: string | null
          carrier_ip?: boolean | null
          click_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_ips_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "blocked_ips_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_leads: {
        Row: {
          business_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          message: string | null
          notes: string | null
          status: string | null
          tags: string[] | null
          whatsapp: string | null
        }
        Insert: {
          business_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          notes?: string | null
          status?: string | null
          tags?: string[] | null
          whatsapp?: string | null
        }
        Update: {
          business_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          notes?: string | null
          status?: string | null
          tags?: string[] | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      brand_team_members: {
        Row: {
          accepted_at: string | null
          brand_owner_id: string
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          member_user_id: string | null
          permissions: Json | null
          removed_at: string | null
          role: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          brand_owner_id: string
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          member_user_id?: string | null
          permissions?: Json | null
          removed_at?: string | null
          role?: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          brand_owner_id?: string
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          member_user_id?: string | null
          permissions?: Json | null
          removed_at?: string | null
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_team_members_brand_owner_id_fkey"
            columns: ["brand_owner_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "brand_team_members_brand_owner_id_fkey"
            columns: ["brand_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "brand_team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_team_members_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "brand_team_members_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          batteur_id: string
          budget: number
          cost_per_lead_fcfa: number | null
          cpa_amount: number | null
          cpa_event: string | null
          cpc: number
          created_at: string | null
          creative_urls: string[] | null
          deleted_at: string | null
          description: string | null
          destination_url: string
          ends_at: string | null
          id: string
          landing_page_id: string | null
          leads_captured_count: number | null
          low_conversion_flagged: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          objective: string
          pixel_id: string | null
          pricing_model: string
          setup_fee_amount_fcfa: number | null
          setup_fee_paid: boolean | null
          spent: number | null
          starts_at: string | null
          status: string | null
          target_cities: string[] | null
          title: string
          tracked_events: string[] | null
        }
        Insert: {
          batteur_id: string
          budget: number
          cost_per_lead_fcfa?: number | null
          cpa_amount?: number | null
          cpa_event?: string | null
          cpc: number
          created_at?: string | null
          creative_urls?: string[] | null
          deleted_at?: string | null
          description?: string | null
          destination_url: string
          ends_at?: string | null
          id?: string
          landing_page_id?: string | null
          leads_captured_count?: number | null
          low_conversion_flagged?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          objective?: string
          pixel_id?: string | null
          pricing_model?: string
          setup_fee_amount_fcfa?: number | null
          setup_fee_paid?: boolean | null
          spent?: number | null
          starts_at?: string | null
          status?: string | null
          target_cities?: string[] | null
          title: string
          tracked_events?: string[] | null
        }
        Update: {
          batteur_id?: string
          budget?: number
          cost_per_lead_fcfa?: number | null
          cpa_amount?: number | null
          cpa_event?: string | null
          cpc?: number
          created_at?: string | null
          creative_urls?: string[] | null
          deleted_at?: string | null
          description?: string | null
          destination_url?: string
          ends_at?: string | null
          id?: string
          landing_page_id?: string | null
          leads_captured_count?: number | null
          low_conversion_flagged?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          objective?: string
          pixel_id?: string | null
          pricing_model?: string
          setup_fee_amount_fcfa?: number | null
          setup_fee_paid?: boolean | null
          spent?: number | null
          starts_at?: string | null
          status?: string | null
          target_cities?: string[] | null
          title?: string
          tracked_events?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_batteur_id_fkey"
            columns: ["batteur_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "campaigns_batteur_id_fkey"
            columns: ["batteur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "campaigns_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "pixels"
            referencedColumns: ["pixel_id"]
          },
        ]
      }
      carrier_ip_ranges: {
        Row: {
          carrier: string
          country: string | null
          created_at: string | null
          id: string
          ip_prefix: string
          notes: string | null
        }
        Insert: {
          carrier: string
          country?: string | null
          created_at?: string | null
          id?: string
          ip_prefix: string
          notes?: string | null
        }
        Update: {
          carrier?: string
          country?: string | null
          created_at?: string | null
          id?: string
          ip_prefix?: string
          notes?: string | null
        }
        Relationships: []
      }
      challenge_egg_cracks: {
        Row: {
          amount: number
          challenge_id: string
          cracked_at: string | null
          echo_id: string
          id: string
          reward_id: string
          tier: string
        }
        Insert: {
          amount: number
          challenge_id: string
          cracked_at?: string | null
          echo_id: string
          id?: string
          reward_id: string
          tier: string
        }
        Update: {
          amount?: number
          challenge_id?: string
          cracked_at?: string | null
          echo_id?: string
          id?: string
          reward_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_egg_cracks_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_egg_cracks_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "challenge_egg_cracks_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_egg_cracks_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "challenge_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          echo_id: string
          eggs_earned: number | null
          id: string
          joined_at: string | null
          total_won: number | null
          valid_clicks: number | null
        }
        Insert: {
          challenge_id: string
          echo_id: string
          eggs_earned?: number | null
          id?: string
          joined_at?: string | null
          total_won?: number | null
          valid_clicks?: number | null
        }
        Update: {
          challenge_id?: string
          echo_id?: string
          eggs_earned?: number | null
          id?: string
          joined_at?: string | null
          total_won?: number | null
          valid_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "challenge_participants_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_rewards: {
        Row: {
          amount: number
          challenge_id: string
          color: string | null
          created_at: string | null
          emoji: string | null
          id: string
          remaining_quantity: number
          tier: string
          total_quantity: number
        }
        Insert: {
          amount: number
          challenge_id: string
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          remaining_quantity: number
          tier: string
          total_quantity: number
        }
        Update: {
          amount?: number
          challenge_id?: string
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          remaining_quantity?: number
          tier?: string
          total_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          budget_spent: number | null
          campaign_id: string | null
          clicks_per_reward: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string | null
          theme: string | null
          total_budget: number
        }
        Insert: {
          budget_spent?: number | null
          campaign_id?: string | null
          clicks_per_reward?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string | null
          theme?: string | null
          total_budget: number
        }
        Update: {
          budget_spent?: number | null
          campaign_id?: string | null
          clicks_per_reward?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string | null
          theme?: string | null
          total_budget?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          is_valid: boolean | null
          link_id: string
          rejection_reason: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          link_id: string
          rejection_reason?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          link_id?: string
          rejection_reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
      content_signals: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          name_en: string
          name_fr: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id: string
          name_en: string
          name_fr: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          name_en?: string
          name_fr?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversions: {
        Row: {
          attributed: boolean | null
          attribution_type: string | null
          attribution_window_hours: number | null
          brand_id: string
          campaign_id: string | null
          click_to_conversion_seconds: number | null
          created_at: string
          echo_earning: number | null
          echo_id: string | null
          event: string
          event_name: string | null
          external_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          paid_at: string | null
          payment_amount: number | null
          payment_status: string
          pixel_id: string
          tm_ref: string | null
          tracked_link_id: string | null
          user_agent: string | null
          value_amount: number | null
          value_currency: string | null
        }
        Insert: {
          attributed?: boolean | null
          attribution_type?: string | null
          attribution_window_hours?: number | null
          brand_id: string
          campaign_id?: string | null
          click_to_conversion_seconds?: number | null
          created_at?: string
          echo_earning?: number | null
          echo_id?: string | null
          event: string
          event_name?: string | null
          external_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          pixel_id: string
          tm_ref?: string | null
          tracked_link_id?: string | null
          user_agent?: string | null
          value_amount?: number | null
          value_currency?: string | null
        }
        Update: {
          attributed?: boolean | null
          attribution_type?: string | null
          attribution_window_hours?: number | null
          brand_id?: string
          campaign_id?: string | null
          click_to_conversion_seconds?: number | null
          created_at?: string
          echo_earning?: number | null
          echo_id?: string | null
          event?: string
          event_name?: string | null
          external_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          pixel_id?: string
          tm_ref?: string | null
          tracked_link_id?: string | null
          user_agent?: string | null
          value_amount?: number | null
          value_currency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "conversions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "conversions_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "pixels"
            referencedColumns: ["pixel_id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          author_id: string
          contact_id: string
          contact_type: string
          content: string
          created_at: string | null
          followup_date: string | null
          id: string
          note_type: string | null
        }
        Insert: {
          author_id: string
          contact_id: string
          contact_type: string
          content: string
          created_at?: string | null
          followup_date?: string | null
          id?: string
          note_type?: string | null
        }
        Update: {
          author_id?: string
          contact_id?: string
          contact_type?: string
          content?: string
          created_at?: string | null
          followup_date?: string | null
          id?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "crm_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_achievements: {
        Row: {
          achieved_at: string | null
          echo_id: string
          id: string
          milestone_id: string
          reward_credited: boolean | null
          reward_fcfa: number
        }
        Insert: {
          achieved_at?: string | null
          echo_id: string
          id?: string
          milestone_id: string
          reward_credited?: boolean | null
          reward_fcfa: number
        }
        Update: {
          achieved_at?: string | null
          echo_id?: string
          id?: string
          milestone_id?: string
          reward_credited?: boolean | null
          reward_fcfa?: number
        }
        Relationships: [
          {
            foreignKeyName: "echo_achievements_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "echo_achievements_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_achievements_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "gamification_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_content_signals: {
        Row: {
          created_at: string | null
          echo_id: string
          signal_id: string
        }
        Insert: {
          created_at?: string | null
          echo_id: string
          signal_id: string
        }
        Update: {
          created_at?: string | null
          echo_id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_content_signals_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "echo_content_signals_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_content_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "content_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_interests: {
        Row: {
          created_at: string | null
          echo_id: string
          interest_id: string
        }
        Insert: {
          created_at?: string | null
          echo_id: string
          interest_id: string
        }
        Update: {
          created_at?: string | null
          echo_id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_interests_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "echo_interests_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interest_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_streaks: {
        Row: {
          current_streak: number | null
          echo_id: string
          id: string
          last_campaign_date: string | null
          longest_streak: number | null
          month_reward_paid: boolean | null
          quarter_reward_paid: boolean | null
          quarter_start_date: string | null
          streak_updated_at: string | null
          week_reward_paid: boolean | null
        }
        Insert: {
          current_streak?: number | null
          echo_id: string
          id?: string
          last_campaign_date?: string | null
          longest_streak?: number | null
          month_reward_paid?: boolean | null
          quarter_reward_paid?: boolean | null
          quarter_start_date?: string | null
          streak_updated_at?: string | null
          week_reward_paid?: boolean | null
        }
        Update: {
          current_streak?: number | null
          echo_id?: string
          id?: string
          last_campaign_date?: string | null
          longest_streak?: number | null
          month_reward_paid?: boolean | null
          quarter_reward_paid?: boolean | null
          quarter_start_date?: string | null
          streak_updated_at?: string | null
          week_reward_paid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "echo_streaks_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: true
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "echo_streaks_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          id: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          subject_line: string
          target_segment: string
          template_key: string
          total_recipients: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject_line: string
          target_segment: string
          template_key: string
          total_recipients?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject_line?: string
          target_segment?: string
          template_key?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_snapshots: {
        Row: {
          ambassador_commissions: number
          brands_active: number
          challenge_rewards: number
          clicks_invalid: number
          clicks_verified: number
          created_at: string | null
          echo_payouts: number
          echos_active: number
          gross_margin: number
          gross_revenue: number
          id: string
          net_revenue: number
          new_brands: number
          new_echos: number
          snapshot_date: string
          tamtam_commission: number
          wave_checkout_fees: number
          wave_payout_fees: number
          welcome_bonuses: number
        }
        Insert: {
          ambassador_commissions?: number
          brands_active?: number
          challenge_rewards?: number
          clicks_invalid?: number
          clicks_verified?: number
          created_at?: string | null
          echo_payouts?: number
          echos_active?: number
          gross_margin?: number
          gross_revenue?: number
          id?: string
          net_revenue?: number
          new_brands?: number
          new_echos?: number
          snapshot_date: string
          tamtam_commission?: number
          wave_checkout_fees?: number
          wave_payout_fees?: number
          welcome_bonuses?: number
        }
        Update: {
          ambassador_commissions?: number
          brands_active?: number
          challenge_rewards?: number
          clicks_invalid?: number
          clicks_verified?: number
          created_at?: string | null
          echo_payouts?: number
          echos_active?: number
          gross_margin?: number
          gross_revenue?: number
          id?: string
          net_revenue?: number
          new_brands?: number
          new_echos?: number
          snapshot_date?: string
          tamtam_commission?: number
          wave_checkout_fees?: number
          wave_payout_fees?: number
          welcome_bonuses?: number
        }
        Relationships: []
      }
      gamification_caps: {
        Row: {
          cap_type: string
          current_amount_fcfa: number
          id: string
          is_active: boolean
          max_amount_fcfa: number
          period_start: string
          updated_at: string
        }
        Insert: {
          cap_type: string
          current_amount_fcfa?: number
          id?: string
          is_active?: boolean
          max_amount_fcfa: number
          period_start?: string
          updated_at?: string
        }
        Update: {
          cap_type?: string
          current_amount_fcfa?: number
          id?: string
          is_active?: boolean
          max_amount_fcfa?: number
          period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_milestones: {
        Row: {
          active: boolean | null
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          key: string
          reward_fcfa: number
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          condition_type: string
          condition_value: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          reward_fcfa?: number
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          reward_fcfa?: number
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      interest_categories: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          name_en: string
          name_fr: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id: string
          name_en: string
          name_fr: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          name_en?: string
          name_fr?: string
          sort_order?: number
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          campaign_id: string | null
          campaign_name: string
          clicks: number | null
          cpc_fcfa: number | null
          cpl_fcfa: number | null
          created_at: string | null
          id: string
          invoice_id: string
          leads: number | null
          objective: string | null
          period: string | null
          total_spend_fcfa: number
        }
        Insert: {
          campaign_id?: string | null
          campaign_name: string
          clicks?: number | null
          cpc_fcfa?: number | null
          cpl_fcfa?: number | null
          created_at?: string | null
          id?: string
          invoice_id: string
          leads?: number | null
          objective?: string | null
          period?: string | null
          total_spend_fcfa: number
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string
          clicks?: number | null
          cpc_fcfa?: number | null
          cpl_fcfa?: number | null
          created_at?: string | null
          id?: string
          invoice_id?: string
          leads?: number | null
          objective?: string | null
          period?: string | null
          total_spend_fcfa?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          brand_id: string
          campaign_count: number | null
          click_count: number | null
          created_at: string | null
          id: string
          invoice_number: string
          net_amount_fcfa: number | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          total_recharges_fcfa: number | null
          total_refunds_fcfa: number | null
          total_spend_fcfa: number | null
        }
        Insert: {
          brand_id: string
          campaign_count?: number | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          invoice_number: string
          net_amount_fcfa?: number | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          total_recharges_fcfa?: number | null
          total_refunds_fcfa?: number | null
          total_spend_fcfa?: number | null
        }
        Update: {
          brand_id?: string
          campaign_count?: number | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string
          net_amount_fcfa?: number | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_recharges_fcfa?: number | null
          total_refunds_fcfa?: number | null
          total_spend_fcfa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          ai_generation_id: string | null
          batteur_id: string
          brand_accent_color: string | null
          brand_color: string
          campaign_id: string
          created_at: string
          cta_text: string
          deleted_at: string | null
          description: string | null
          form_fields: Json
          headline: string
          hero_image_url: string | null
          id: string
          landing_page_approved: boolean
          logo_url: string | null
          notification_email: string | null
          notification_phone: string | null
          slug: string
          status: string
          subheadline: string | null
          template: string
        }
        Insert: {
          ai_generation_id?: string | null
          batteur_id: string
          brand_accent_color?: string | null
          brand_color: string
          campaign_id: string
          created_at?: string
          cta_text: string
          deleted_at?: string | null
          description?: string | null
          form_fields?: Json
          headline: string
          hero_image_url?: string | null
          id?: string
          landing_page_approved?: boolean
          logo_url?: string | null
          notification_email?: string | null
          notification_phone?: string | null
          slug: string
          status?: string
          subheadline?: string | null
          template?: string
        }
        Update: {
          ai_generation_id?: string | null
          batteur_id?: string
          brand_accent_color?: string | null
          brand_color?: string
          campaign_id?: string
          created_at?: string
          cta_text?: string
          deleted_at?: string | null
          description?: string | null
          form_fields?: Json
          headline?: string
          hero_image_url?: string | null
          id?: string
          landing_page_approved?: boolean
          logo_url?: string | null
          notification_email?: string | null
          notification_phone?: string | null
          slug?: string
          status?: string
          subheadline?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_ai_generation_id_fkey"
            columns: ["ai_generation_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_batteur_id_fkey"
            columns: ["batteur_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "landing_pages_batteur_id_fkey"
            columns: ["batteur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string
          consent_given: boolean
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          echo_id: string | null
          email: string | null
          fraud_score: number | null
          id: string
          ip_address: string | null
          landing_page_id: string
          name: string
          payout_amount: number | null
          payout_status: string | null
          phone: string
          rejection_reason: string | null
          status: string
          tracked_link_id: string | null
          user_agent: string | null
          verified_at: string | null
        }
        Insert: {
          campaign_id: string
          consent_given: boolean
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          echo_id?: string | null
          email?: string | null
          fraud_score?: number | null
          id?: string
          ip_address?: string | null
          landing_page_id: string
          name: string
          payout_amount?: number | null
          payout_status?: string | null
          phone: string
          rejection_reason?: string | null
          status?: string
          tracked_link_id?: string | null
          user_agent?: string | null
          verified_at?: string | null
        }
        Update: {
          campaign_id?: string
          consent_given?: boolean
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          echo_id?: string | null
          email?: string | null
          fraud_score?: number | null
          id?: string
          ip_address?: string | null
          landing_page_id?: string
          name?: string
          payout_amount?: number | null
          payout_status?: string | null
          phone?: string
          rejection_reason?: string | null
          status?: string
          tracked_link_id?: string | null
          user_agent?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "leads_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tracked_link_id_fkey"
            columns: ["tracked_link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_daily_caps: {
        Row: {
          date: string
          echo_id: string
          send_count: number
        }
        Insert: {
          date?: string
          echo_id: string
          send_count?: number
        }
        Update: {
          date?: string
          echo_id?: string
          send_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_daily_caps_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "notification_daily_caps_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          echo_id: string
          error_message: string | null
          id: string
          status: string
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          echo_id: string
          error_message?: string | null
          id?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          echo_id?: string
          error_message?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "notification_logs_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          echo_id: string
          id: string
          payload: Json
          scheduled_for: string
          sent_at: string | null
          status: string
          suppression_reason: string | null
          type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          echo_id: string
          id?: string
          payload?: Json
          scheduled_for: string
          sent_at?: string | null
          status?: string
          suppression_reason?: string | null
          type: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          echo_id?: string
          id?: string
          payload?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          suppression_reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "notification_queue_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          id: string
          lang: string | null
          name: string
          push_body: string | null
          push_title: string | null
          push_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          lang?: string | null
          name: string
          push_body?: string | null
          push_title?: string | null
          push_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          lang?: string | null
          name?: string
          push_body?: string | null
          push_title?: string | null
          push_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          campaign_id: string | null
          client_phone: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          payment_method: string | null
          paytech_token: string | null
          ref_command: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          paytech_token?: string | null
          ref_command: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          paytech_token?: string | null
          ref_command?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          echo_id: string
          external_id: string | null
          failure_reason: string | null
          id: string
          paytech_token: string | null
          paytech_transfer_id: string | null
          provider: string | null
          status: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          echo_id: string
          external_id?: string | null
          failure_reason?: string | null
          id?: string
          paytech_token?: string | null
          paytech_transfer_id?: string | null
          provider?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          echo_id?: string
          external_id?: string | null
          failure_reason?: string | null
          id?: string
          paytech_token?: string | null
          paytech_transfer_id?: string | null
          provider?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "payouts_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_earnings: {
        Row: {
          amount_fcfa: number
          campaign_id: string
          campaign_name: string | null
          click_count: number
          created_at: string
          echo_id: string
          id: string
          status: string
          unlock_date: string
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          amount_fcfa?: number
          campaign_id: string
          campaign_name?: string | null
          click_count?: number
          created_at?: string
          echo_id: string
          id?: string
          status?: string
          unlock_date: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_fcfa?: number
          campaign_id?: string
          campaign_name?: string | null
          click_count?: number
          created_at?: string
          echo_id?: string
          id?: string
          status?: string
          unlock_date?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_earnings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_earnings_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "pending_earnings_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pixels: {
        Row: {
          allowed_events: string[] | null
          api_key_hash: string
          brand_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_conversion_at: string | null
          last_test_at: string | null
          last_test_error: string | null
          last_test_latency_ms: number | null
          name: string
          pixel_id: string
          platform: string
          test_count: number | null
          test_status: string | null
          total_conversions: number | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          allowed_events?: string[] | null
          api_key_hash: string
          brand_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_conversion_at?: string | null
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_latency_ms?: number | null
          name: string
          pixel_id: string
          platform?: string
          test_count?: number | null
          test_status?: string | null
          total_conversions?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          allowed_events?: string[] | null
          api_key_hash?: string
          brand_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_conversion_at?: string | null
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_latency_ms?: number | null
          name?: string
          pixel_id?: string
          platform?: string
          test_count?: number | null
          test_status?: string | null
          total_conversions?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pixels_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "pixels_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_alerts_sent: {
        Row: {
          alert_key: string
          id: string
          sent_at: string | null
          severity: string
          subject: string
        }
        Insert: {
          alert_key: string
          id?: string
          sent_at?: string | null
          severity: string
          subject: string
        }
        Update: {
          alert_key?: string
          id?: string
          sent_at?: string | null
          severity?: string
          subject?: string
        }
        Relationships: []
      }
      reconciliation_auto_heals: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          issue_id: string | null
          subject_id: string | null
          subject_type: string | null
          success: boolean
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          issue_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          success: boolean
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          issue_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_auto_heals_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_issues: {
        Row: {
          actual_value: number | null
          auto_healable: boolean | null
          category: string
          created_at: string | null
          description: string
          discrepancy: number | null
          expected_value: number | null
          id: string
          metadata: Json | null
          resolution_note: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          snapshot_id: string | null
          subject_id: string | null
          subject_type: string | null
          suggested_action: string | null
        }
        Insert: {
          actual_value?: number | null
          auto_healable?: boolean | null
          category: string
          created_at?: string | null
          description: string
          discrepancy?: number | null
          expected_value?: number | null
          id?: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          snapshot_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          suggested_action?: string | null
        }
        Update: {
          actual_value?: number | null
          auto_healable?: boolean | null
          category?: string
          created_at?: string | null
          description?: string
          discrepancy?: number | null
          expected_value?: number | null
          id?: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          snapshot_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_issues_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_snapshots: {
        Row: {
          brand_balance_total: number
          compute_duration_ms: number | null
          computed_at: string | null
          critical_issues_count: number
          echo_balance_total: number
          id: string
          info_issues_count: number
          platform_liabilities_total: number
          scan_type: string
          total_discrepancy: number
          warning_issues_count: number
          wave_checkouts_count: number
          wave_checkouts_total: number
          wave_fees_total: number
          wave_payouts_count: number
          wave_payouts_total: number
          wave_wallet_expected: number
        }
        Insert: {
          brand_balance_total: number
          compute_duration_ms?: number | null
          computed_at?: string | null
          critical_issues_count?: number
          echo_balance_total: number
          id?: string
          info_issues_count?: number
          platform_liabilities_total: number
          scan_type?: string
          total_discrepancy?: number
          warning_issues_count?: number
          wave_checkouts_count: number
          wave_checkouts_total: number
          wave_fees_total: number
          wave_payouts_count: number
          wave_payouts_total: number
          wave_wallet_expected: number
        }
        Update: {
          brand_balance_total?: number
          compute_duration_ms?: number | null
          computed_at?: string | null
          critical_issues_count?: number
          echo_balance_total?: number
          id?: string
          info_issues_count?: number
          platform_liabilities_total?: number
          scan_type?: string
          total_discrepancy?: number
          warning_issues_count?: number
          wave_checkouts_count?: number
          wave_checkouts_total?: number
          wave_fees_total?: number
          wave_payouts_count?: number
          wave_payouts_total?: number
          wave_wallet_expected?: number
        }
        Relationships: []
      }
      roadmap_goals: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          metric_key: string
          metric_label: string
          phase: string
          phase_label: string
          sort_order: number | null
          target_value: number
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          metric_key: string
          metric_label: string
          phase: string
          phase_label: string
          sort_order?: number | null
          target_value: number
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          metric_key?: string
          metric_label?: string
          phase?: string
          phase_label?: string
          sort_order?: number | null
          target_value?: number
        }
        Relationships: []
      }
      roadmap_milestones: {
        Row: {
          achieved: boolean | null
          achieved_at: string | null
          created_at: string | null
          description: string | null
          id: string
          phase: string
          sort_order: number | null
          target_date: string | null
          title: string
        }
        Insert: {
          achieved?: boolean | null
          achieved_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phase: string
          sort_order?: number | null
          target_date?: string | null
          title: string
        }
        Update: {
          achieved?: boolean | null
          achieved_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phase?: string
          sort_order?: number | null
          target_date?: string | null
          title?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sent_emails: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email_type: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email_type: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "sent_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_test_logs: {
        Row: {
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          message: string
          mtarget_ticket: string | null
          notes: string | null
          phone: string
          raw_response: string | null
          sender: string | null
          sent_at: string | null
          serviceid: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message: string
          mtarget_ticket?: string | null
          notes?: string | null
          phone: string
          raw_response?: string | null
          sender?: string | null
          sent_at?: string | null
          serviceid?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message?: string
          mtarget_ticket?: string | null
          notes?: string | null
          phone?: string
          raw_response?: string | null
          sender?: string | null
          sent_at?: string | null
          serviceid?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_test_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "sms_test_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_rewards: {
        Row: {
          credited_at: string | null
          echo_id: string
          id: string
          reward_fcfa: number
          streak_count: number
        }
        Insert: {
          credited_at?: string | null
          echo_id: string
          id?: string
          reward_fcfa: number
          streak_count: number
        }
        Update: {
          credited_at?: string | null
          echo_id?: string
          id?: string
          reward_fcfa?: number
          streak_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "streak_rewards_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "streak_rewards_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string | null
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string | null
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string | null
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "support_tickets_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_links: {
        Row: {
          campaign_id: string
          click_count: number | null
          created_at: string | null
          echo_id: string
          id: string
          short_code: string
          tm_ref: string | null
        }
        Insert: {
          campaign_id: string
          click_count?: number | null
          created_at?: string | null
          echo_id: string
          id?: string
          short_code: string
          tm_ref?: string | null
        }
        Update: {
          campaign_id?: string
          click_count?: number | null
          created_at?: string | null
          echo_id?: string
          id?: string
          short_code?: string
          tm_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_links_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "tracked_links_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          audience_size_range: string | null
          available_balance: number | null
          balance: number | null
          brand_owner_id: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          crm_stage: string | null
          crm_tags: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          industry: string | null
          interests_completed_at: string | null
          interests_prompt_dismissed_at: string | null
          is_founding_echo: boolean | null
          last_sms_at: string | null
          last_used_brand_id: string | null
          leaderboard_notify: boolean | null
          logo_url: string | null
          mobile_money_provider: string | null
          name: string
          notification_prefs: Json | null
          original_email: string | null
          pending_balance: number | null
          phone: string | null
          platforms: string[] | null
          primary_platform: string | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          referred_by_ambassador: string | null
          risk_level: string | null
          role: string
          signup_tm_ref: string | null
          sms_optout: boolean | null
          sms_optout_at: string | null
          status: string | null
          successful_referrals: number | null
          team_permissions: Json | null
          team_position: string | null
          terms_accepted_at: string | null
          tier: string | null
          tier_bonus_percent: number | null
          tier_perks: Json | null
          total_campaigns_joined: number | null
          total_earned: number | null
          total_recharged: number | null
          total_valid_clicks: number | null
        }
        Insert: {
          audience_size_range?: string | null
          available_balance?: number | null
          balance?: number | null
          brand_owner_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          crm_stage?: string | null
          crm_tags?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id: string
          industry?: string | null
          interests_completed_at?: string | null
          interests_prompt_dismissed_at?: string | null
          is_founding_echo?: boolean | null
          last_sms_at?: string | null
          last_used_brand_id?: string | null
          leaderboard_notify?: boolean | null
          logo_url?: string | null
          mobile_money_provider?: string | null
          name: string
          notification_prefs?: Json | null
          original_email?: string | null
          pending_balance?: number | null
          phone?: string | null
          platforms?: string[] | null
          primary_platform?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          referred_by_ambassador?: string | null
          risk_level?: string | null
          role: string
          signup_tm_ref?: string | null
          sms_optout?: boolean | null
          sms_optout_at?: string | null
          status?: string | null
          successful_referrals?: number | null
          team_permissions?: Json | null
          team_position?: string | null
          terms_accepted_at?: string | null
          tier?: string | null
          tier_bonus_percent?: number | null
          tier_perks?: Json | null
          total_campaigns_joined?: number | null
          total_earned?: number | null
          total_recharged?: number | null
          total_valid_clicks?: number | null
        }
        Update: {
          audience_size_range?: string | null
          available_balance?: number | null
          balance?: number | null
          brand_owner_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          crm_stage?: string | null
          crm_tags?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          industry?: string | null
          interests_completed_at?: string | null
          interests_prompt_dismissed_at?: string | null
          is_founding_echo?: boolean | null
          last_sms_at?: string | null
          last_used_brand_id?: string | null
          leaderboard_notify?: boolean | null
          logo_url?: string | null
          mobile_money_provider?: string | null
          name?: string
          notification_prefs?: Json | null
          original_email?: string | null
          pending_balance?: number | null
          phone?: string | null
          platforms?: string[] | null
          primary_platform?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          referred_by_ambassador?: string | null
          risk_level?: string | null
          role?: string
          signup_tm_ref?: string | null
          sms_optout?: boolean | null
          sms_optout_at?: string | null
          status?: string | null
          successful_referrals?: number | null
          team_permissions?: Json | null
          team_position?: string | null
          terms_accepted_at?: string | null
          tier?: string | null
          tier_bonus_percent?: number | null
          tier_perks?: Json | null
          total_campaigns_joined?: number | null
          total_earned?: number | null
          total_recharged?: number | null
          total_valid_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_brand_owner_id_fkey"
            columns: ["brand_owner_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "users_brand_owner_id_fkey"
            columns: ["brand_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_last_used_brand_id_fkey"
            columns: ["last_used_brand_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "users_last_used_brand_id_fkey"
            columns: ["last_used_brand_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_referred_by_ambassador_fkey"
            columns: ["referred_by_ambassador"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          type: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          type?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          type?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_echo_analysis"
            referencedColumns: ["echo_id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_checkouts: {
        Row: {
          amount: number
          checkout_status: string
          client_reference: string | null
          completed_at: string | null
          created_at: string
          currency: string
          error_message: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_status: string | null
          user_id: string
          wave_checkout_id: string
          wave_launch_url: string | null
        }
        Insert: {
          amount: number
          checkout_status?: string
          client_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          user_id: string
          wave_checkout_id: string
          wave_launch_url?: string | null
        }
        Update: {
          amount?: number
          checkout_status?: string
          client_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          user_id?: string
          wave_checkout_id?: string
          wave_launch_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wave_checkouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_payouts: {
        Row: {
          amount: number
          client_reference: string | null
          completed_at: string | null
          created_at: string
          currency: string
          error_code: string | null
          error_message: string | null
          fee: number
          id: string
          idempotency_key: string
          mobile: string
          net_amount: number
          payout_id: string | null
          payout_status: string
          receipt_url: string | null
          user_id: string
          wave_payout_id: string | null
          wave_transaction_id: string | null
        }
        Insert: {
          amount: number
          client_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          fee?: number
          id?: string
          idempotency_key: string
          mobile: string
          net_amount: number
          payout_id?: string | null
          payout_status?: string
          receipt_url?: string | null
          user_id: string
          wave_payout_id?: string | null
          wave_transaction_id?: string | null
        }
        Update: {
          amount?: number
          client_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          fee?: number
          id?: string
          idempotency_key?: string
          mobile?: string
          net_amount?: number
          payout_id?: string | null
          payout_status?: string
          receipt_url?: string | null
          user_id?: string
          wave_payout_id?: string | null
          wave_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wave_payouts_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          wave_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          wave_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          wave_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      fraud_echo_analysis: {
        Row: {
          echo_id: string | null
          invalid_clicks: number | null
          links_created: number | null
          name: string | null
          phone: string | null
          risk_level: string | null
          suspicious_repeat_ips: number | null
          total_clicks: number | null
          valid_clicks: number | null
          valid_rate_pct: number | null
        }
        Relationships: []
      }
      fraud_ip_analysis: {
        Row: {
          active_days: number | null
          first_click: string | null
          invalid_clicks: number | null
          ip_address: string | null
          is_carrier_ip: boolean | null
          last_click: string | null
          risk_assessment: string | null
          time_span_seconds: number | null
          total_clicks: number | null
          unique_links: number | null
          valid_clicks: number | null
        }
        Relationships: []
      }
      superadmin_metrics: {
        Row: {
          active_campaigns: number | null
          clicks_this_week: number | null
          clicks_today: number | null
          computed_at: string | null
          gmv_this_month: number | null
          new_brands_this_month: number | null
          new_echos_this_week: number | null
          pending_payouts: number | null
          platform_revenue_fcfa: number | null
          platform_revenue_this_month: number | null
          total_brands: number | null
          total_campaigns: number | null
          total_echo_available: number | null
          total_echo_pending: number | null
          total_echos: number | null
          total_gmv_fcfa: number | null
          total_valid_clicks: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_click_counters: {
        Args: {
          p_campaign_id: string
          p_click_delta: number
          p_cpc: number
          p_echo_earnings: number
          p_echo_id: string
          p_link_id: string
        }
        Returns: undefined
      }
      calculate_echo_tier: { Args: { clicks: number }; Returns: string }
      credit_echo_pending: {
        Args: {
          p_amount: number
          p_campaign_id: string
          p_conversion_id: string
          p_echo_id: string
        }
        Returns: undefined
      }
      credit_wallet_from_checkout: {
        Args: {
          p_amount: number
          p_payment_id: string
          p_user_id: string
          p_wave_checkout_id: string
        }
        Returns: boolean
      }
      debit_brand_budget: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      debit_campaign_for_lead: {
        Args: {
          p_campaign_id: string
          p_cpl: number
          p_echo_earnings: number
          p_echo_id: string
        }
        Returns: boolean
      }
      debit_wallet_for_payout: {
        Args: { p_amount: number; p_idempotency_key: string; p_user_id: string }
        Returns: boolean
      }
      deduct_available_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      deduct_brand_balance: {
        Args: {
          p_amount: number
          p_brand_id: string
          p_campaign_id: string
          p_conversion_id: string
        }
        Returns: undefined
      }
      find_campaign_accounting_mismatches: {
        Args: never
        Returns: {
          campaign_id: string
          campaign_name: string
          campaign_spent: number
          clicks_count: number
          computed_spent: number
        }[]
      }
      find_completed_campaigns_without_refund: {
        Args: never
        Returns: {
          budget: number
          campaign_id: string
          campaign_name: string
          remaining: number
          spent: number
        }[]
      }
      find_failed_payouts_without_refund: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          payout_id: string
          user_id: string
        }[]
      }
      find_orphan_checkout_credits: {
        Args: never
        Returns: {
          amount: number
          checkout_id: string
          completed_at: string
          user_id: string
        }[]
      }
      find_user_balance_mismatches: {
        Args: never
        Returns: {
          actual_balance: number
          expected_balance: number
          role: string
          transaction_count: number
          user_id: string
          user_name: string
        }[]
      }
      get_echo_click_stats: {
        Args: never
        Returns: {
          echo_id: string
          fraud_clicks: number
          fraud_rate: number
          total_clicks: number
          valid_clicks: number
        }[]
      }
      get_leaderboard: {
        Args: { limit_count: number; since_date: string }
        Returns: {
          campaigns_joined: number
          echo_id: string
          name: string
          tier: string
          total_clicks: number
        }[]
      }
      get_tier_bonus: { Args: { tier_name: string }; Returns: number }
      increment_ai_usage_count: {
        Args: { p_brand_id: string; p_month: string }
        Returns: undefined
      }
      increment_available_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_campaign_counters: {
        Args: { p_campaign_id: string; p_failed: number; p_sent: number }
        Returns: undefined
      }
      increment_click: {
        Args: {
          p_campaign_id: string
          p_cpc: number
          p_echo_earnings: number
          p_echo_id: string
          p_link_id: string
        }
        Returns: boolean
      }
      increment_echo_balance: {
        Args: { p_amount: number; p_echo_id: string }
        Returns: undefined
      }
      increment_echo_clicks: { Args: { p_echo_id: string }; Returns: undefined }
      increment_pending_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_recharged: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_referral_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      process_cpa_conversion: {
        Args: {
          p_campaign_id: string
          p_conversion_id: string
          p_cpa_amount: number
          p_echo_earning: number
          p_echo_id: string
        }
        Returns: boolean
      }
      process_payout: {
        Args: { p_payout_id: string; p_reason?: string; p_status: string }
        Returns: undefined
      }
      refund_campaign_for_lead: {
        Args: {
          p_campaign_id: string
          p_cpl: number
          p_echo_earnings: number
          p_echo_id: string
        }
        Returns: boolean
      }
      refund_wallet_from_payout:
        | {
            Args: { p_amount: number; p_echo_id: string; p_payout_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_amount: number
              p_idempotency_key: string
              p_user_id: string
            }
            Returns: boolean
          }
        | { Args: { p_wave_payout_id: string }; Returns: boolean }
      sum_brand_balances: { Args: never; Returns: number }
      sum_echo_balances: { Args: never; Returns: number }
      transfer_pending_to_available: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
