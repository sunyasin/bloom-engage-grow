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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_type: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          id: string
        }
        Insert: {
          backup_type?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          id?: string
        }
        Update: {
          backup_type?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
        }
        Relationships: []
      }
      classroom_blocks: {
        Row: {
          block_number: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_enabled: boolean | null
          page_id: string | null
          required_payplan: number | null
          required_rating: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          block_number: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean | null
          page_id?: string | null
          required_payplan?: number | null
          required_rating?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          block_number?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean | null
          page_id?: string | null
          required_payplan?: number | null
          required_rating?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      classroom_pages: {
        Row: {
          created_at: string | null
          html_content: string | null
          id: string
          page_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_content?: string | null
          id?: string
          page_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string | null
          id?: string
          page_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          content_html: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          member_count: number | null
          name: string
          owner_id: string | null
          slug: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          content_html?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          member_count?: number | null
          name: string
          owner_id?: string | null
          slug?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          content_html?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          member_count?: number | null
          name?: string
          owner_id?: string | null
          slug?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          is_active: boolean | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_reply_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          parent_message_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          parent_message_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          parent_message_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reply_likes: {
        Row: {
          created_at: string | null
          id: string
          reply_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reply_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_post_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      course_access_rules: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          rule_type: string
          value: Json | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          rule_type: string
          value?: Json | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          rule_type?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "course_access_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_starts: {
        Row: {
          course_id: string
          created_at: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_starts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"] | null
          access_types: string[] | null
          author_id: string
          community_id: string
          cover_image_url: string | null
          created_at: string | null
          delay_days: number | null
          description: string | null
          gifted_emails: string | null
          id: string
          promo_code: string | null
          required_rating: number | null
          required_rating_level:
            | Database["public"]["Enums"]["rating_level"]
            | null
          slug: string
          status: Database["public"]["Enums"]["course_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["access_type"] | null
          access_types?: string[] | null
          author_id: string
          community_id: string
          cover_image_url?: string | null
          created_at?: string | null
          delay_days?: number | null
          description?: string | null
          gifted_emails?: string | null
          id?: string
          promo_code?: string | null
          required_rating?: number | null
          required_rating_level?:
            | Database["public"]["Enums"]["rating_level"]
            | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"] | null
          access_types?: string[] | null
          author_id?: string
          community_id?: string
          cover_image_url?: string | null
          created_at?: string | null
          delay_days?: number | null
          description?: string | null
          gifted_emails?: string | null
          id?: string
          promo_code?: string | null
          required_rating?: number | null
          required_rating_level?:
            | Database["public"]["Enums"]["rating_level"]
            | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content_text: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content_text: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content_text?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      emoji: {
        Row: {
          created_at: string | null
          emoji_char: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          emoji_char?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          emoji_char?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          access: string | null
          community_id: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          is_youtube_stream: boolean | null
          is_zoom_stream: boolean | null
          link: string | null
          location: string | null
          min_rating: number | null
          required_tier: string | null
          send_email: boolean | null
          stream_end_time: string | null
          stream_start_time: string | null
          stream_status: string | null
          title: string
          updated_at: string | null
          youtube_broadcast_id: string | null
          youtube_embed_url: string | null
          youtube_rtmp_url: string | null
          youtube_stream_key: string | null
          youtube_stream_url: string | null
          youtube_watch_url: string | null
          zoom_link: string | null
        }
        Insert: {
          access?: string | null
          community_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_youtube_stream?: boolean | null
          is_zoom_stream?: boolean | null
          link?: string | null
          location?: string | null
          min_rating?: number | null
          required_tier?: string | null
          send_email?: boolean | null
          stream_end_time?: string | null
          stream_start_time?: string | null
          stream_status?: string | null
          title: string
          updated_at?: string | null
          youtube_broadcast_id?: string | null
          youtube_embed_url?: string | null
          youtube_rtmp_url?: string | null
          youtube_stream_key?: string | null
          youtube_stream_url?: string | null
          youtube_watch_url?: string | null
          zoom_link?: string | null
        }
        Update: {
          access?: string | null
          community_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_youtube_stream?: boolean | null
          is_zoom_stream?: boolean | null
          link?: string | null
          location?: string | null
          min_rating?: number | null
          required_tier?: string | null
          send_email?: boolean | null
          stream_end_time?: string | null
          stream_start_time?: string | null
          stream_status?: string | null
          title?: string
          updated_at?: string | null
          youtube_broadcast_id?: string | null
          youtube_embed_url?: string | null
          youtube_rtmp_url?: string | null
          youtube_stream_key?: string | null
          youtube_stream_url?: string | null
          youtube_watch_url?: string | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      help_sections: {
        Row: {
          content_html: string | null
          created_at: string | null
          id: string
          order_index: number | null
          parent_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_html?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          parent_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_html?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          parent_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "help_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          moderator_message: string | null
          status: Database["public"]["Enums"]["homework_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          moderator_message?: string | null
          status?: Database["public"]["Enums"]["homework_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          moderator_message?: string | null
          status?: Database["public"]["Enums"]["homework_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["block_type"]
          config_json: Json | null
          created_at: string | null
          id: string
          lesson_id: string
          order_index: number | null
        }
        Insert: {
          block_type: Database["public"]["Enums"]["block_type"]
          config_json?: Json | null
          created_at?: string | null
          id?: string
          lesson_id: string
          order_index?: number | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["block_type"]
          config_json?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          lesson_id: string
          status: Database["public"]["Enums"]["progress_status"] | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          lesson_id: string
          status?: Database["public"]["Enums"]["progress_status"] | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          status?: Database["public"]["Enums"]["progress_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_html: string | null
          course_id: string
          created_at: string | null
          delay_days: number | null
          has_homework: boolean | null
          homework_blocks_next: boolean | null
          id: string
          order_index: number | null
          parent_lesson_id: string | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"] | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content_html?: string | null
          course_id: string
          created_at?: string | null
          delay_days?: number | null
          has_homework?: boolean | null
          homework_blocks_next?: boolean | null
          id?: string
          order_index?: number | null
          parent_lesson_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content_html?: string | null
          course_id?: string
          created_at?: string | null
          delay_days?: number | null
          has_homework?: boolean | null
          homework_blocks_next?: boolean | null
          id?: string
          order_index?: number | null
          parent_lesson_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_parent_lesson_id_fkey"
            columns: ["parent_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          community_id: string
          created_at: string
          expires_at: string | null
          external_subscription_id: string | null
          id: string
          renewal_period: Database["public"]["Enums"]["renewal_period"]
          started_at: string
          status: Database["public"]["Enums"]["membership_status"]
          subscription_tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          renewal_period?: Database["public"]["Enums"]["renewal_period"]
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          subscription_tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          renewal_period?: Database["public"]["Enums"]["renewal_period"]
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          subscription_tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_subscription_tier_id_fkey"
            columns: ["subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_subscriptions: {
        Row: {
          badge_text: string
          billing_period: string
          community_limit: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          payment_url: string | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_text?: string
          billing_period?: string
          community_limit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_url?: string | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_text?: string
          billing_period?: string
          community_limit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_url?: string | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          post_id: string | null
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          level: number | null
          payplan: number | null
          portal_subscription_id: string | null
          rating: number | null
          real_name: string | null
          sbp_phone: string | null
          state: string | null
          telegram_first_name: string | null
          telegram_id: string | null
          telegram_user_id: number | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          id: string
          last_login_at?: string | null
          last_login_ip?: string | null
          level?: number | null
          payplan?: number | null
          portal_subscription_id?: string | null
          rating?: number | null
          real_name?: string | null
          sbp_phone?: string | null
          state?: string | null
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          level?: number | null
          payplan?: number | null
          portal_subscription_id?: string | null
          rating?: number | null
          real_name?: string | null
          sbp_phone?: string | null
          state?: string | null
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_portal_subscription_id_fkey"
            columns: ["portal_subscription_id"]
            isOneToOne: false
            referencedRelation: "portal_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          max_uses: number | null
          used_count: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          community_id: string | null
          id: string
          level: Database["public"]["Enums"]["rating_level"] | null
          points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["rating_level"] | null
          points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["rating_level"] | null
          points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          community_id: string
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          is_free: boolean
          moderated_at: string | null
          name: string
          payment_url: string | null
          price_monthly: number | null
          price_yearly: number | null
          selected_course_ids: string[] | null
          slug: string
          sort_order: number
          tier_id: number
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          moderated_at?: string | null
          name: string
          payment_url?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          selected_course_ids?: string[] | null
          slug: string
          sort_order?: number
          tier_id?: number
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          moderated_at?: string | null
          name?: string
          payment_url?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          selected_course_ids?: string[] | null
          slug?: string
          sort_order?: number
          tier_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_tiers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          community_id: string | null
          course_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          period_months: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          type: Database["public"]["Enums"]["subscription_type"]
          user_id: string
        }
        Insert: {
          community_id?: string | null
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          period_months?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          type: Database["public"]["Enums"]["subscription_type"]
          user_id: string
        }
        Update: {
          community_id?: string | null
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          period_months?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          type?: Database["public"]["Enums"]["subscription_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          config_json: Json | null
          created_at: string | null
          id: string
          lesson_id: string
          title: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          lesson_id: string
          title: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          community_id: string | null
          course_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          payment_method: string | null
          provider: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          subscription_tier_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          community_id?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          subscription_tier_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          community_id?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          subscription_tier_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_tier_id_fkey"
            columns: ["subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_rating: { Args: { user_id_param: string }; Returns: undefined }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          id: string
          level: number
          rating: number
          real_name: string
        }[]
      }
      get_public_profiles: {
        Args: { profile_ids: string[] }
        Returns: {
          avatar_url: string
          id: string
          level: number
          rating: number
          real_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_rating: { Args: { user_id_param: string }; Returns: undefined }
      is_community_owner: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_type:
        | "open"
        | "delayed"
        | "paid_subscription"
        | "gifted"
        | "promo_code"
        | "by_rating_level"
        | "delayed_by_rating"
      app_role: "user" | "superuser" | "author"
      block_type:
        | "text"
        | "image"
        | "checkbox"
        | "input_text"
        | "button"
        | "link"
        | "list"
        | "video"
      community_role: "owner" | "moderator" | "member"
      course_status: "draft" | "published" | "archived"
      discount_type: "percent" | "fixed"
      homework_status: "ready" | "ok" | "reject"
      lesson_type: "lesson" | "test" | "assignment"
      membership_status: "active" | "canceled" | "expired" | "trial"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      progress_status: "not_started" | "in_progress" | "completed"
      rating_level: "newbie" | "regular" | "experienced" | "guru"
      renewal_period: "monthly" | "yearly" | "lifetime"
      subscription_status: "active" | "expired" | "canceled" | "pending"
      subscription_type: "one_time" | "periodic"
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
      access_type: [
        "open",
        "delayed",
        "paid_subscription",
        "gifted",
        "promo_code",
        "by_rating_level",
        "delayed_by_rating",
      ],
      app_role: ["user", "superuser", "author"],
      block_type: [
        "text",
        "image",
        "checkbox",
        "input_text",
        "button",
        "link",
        "list",
        "video",
      ],
      community_role: ["owner", "moderator", "member"],
      course_status: ["draft", "published", "archived"],
      discount_type: ["percent", "fixed"],
      homework_status: ["ready", "ok", "reject"],
      lesson_type: ["lesson", "test", "assignment"],
      membership_status: ["active", "canceled", "expired", "trial"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      progress_status: ["not_started", "in_progress", "completed"],
      rating_level: ["newbie", "regular", "experienced", "guru"],
      renewal_period: ["monthly", "yearly", "lifetime"],
      subscription_status: ["active", "expired", "canceled", "pending"],
      subscription_type: ["one_time", "periodic"],
    },
  },
} as const
