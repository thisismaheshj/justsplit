/**
 * Generated from the live Supabase schema — do not edit by hand.
 * Regenerate after any migration with the Supabase MCP connector or:
 *   npx supabase gen types typescript --project-id jugylopmjqidimymhapv
 *
 * Caveat worth knowing: the generated `user_recovery.Row` lists
 * answer_1_hash / answer_2_hash / failed_attempts / locked_until, because they
 * are real columns. The client cannot actually read them — migration 0005
 * revokes the table-wide SELECT and grants back only the harmless columns. Ask
 * for a hash and PostgREST returns a permission error, not a value. Select
 * columns explicitly rather than trusting Row to describe what you can see.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      expense_participants: {
        Row: { amount_owed: number; expense_id: string; input_value: number | null; member_id: string; position: number }
        Insert: { amount_owed: number; expense_id: string; input_value?: number | null; member_id: string; position: number }
        Update: { amount_owed?: number; expense_id?: string; input_value?: number | null; member_id?: string; position?: number }
        Relationships: [
          {
            foreignKeyName: "expense_participants_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number; category: string; created_at: string; date: string; description: string
          group_id: string; id: string; note: string | null; paid_by: string
          recurring_expense_id: string | null; split_method: string; updated_at: string
        }
        Insert: {
          amount: number; category?: string; created_at?: string; date: string; description: string
          group_id: string; id?: string; note?: string | null; paid_by: string
          recurring_expense_id?: string | null; split_method: string; updated_at?: string
        }
        Update: {
          amount?: number; category?: string; created_at?: string; date?: string; description?: string
          group_id?: string; id?: string; note?: string | null; paid_by?: string
          recurring_expense_id?: string | null; split_method?: string; updated_at?: string
        }
        Relationships: []
      }
      group_categories: {
        Row: { group_id: string; icon: string; id: string; label: string }
        Insert: { group_id: string; icon: string; id: string; label: string }
        Update: { group_id?: string; icon?: string; id?: string; label?: string }
        Relationships: []
      }
      group_members: {
        Row: {
          archived: boolean; avatar_color: string; avatar_photo: string | null; created_at: string
          group_id: string; id: string; joined_at: string; name: string; role: string
          updated_at: string; user_id: string | null
        }
        Insert: {
          archived?: boolean; avatar_color?: string; avatar_photo?: string | null; created_at?: string
          group_id: string; id?: string; joined_at?: string; name: string; role?: string
          updated_at?: string; user_id?: string | null
        }
        Update: {
          archived?: boolean; avatar_color?: string; avatar_photo?: string | null; created_at?: string
          group_id?: string; id?: string; joined_at?: string; name?: string; role?: string
          updated_at?: string; user_id?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string; created_by: string; currency: string; description: string | null
          id: string; name: string; updated_at: string
        }
        Insert: {
          created_at?: string; created_by: string; currency?: string; description?: string | null
          id?: string; name: string; updated_at?: string
        }
        Update: {
          created_at?: string; created_by?: string; currency?: string; description?: string | null
          id?: string; name?: string; updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; email: string | null; id: string; name: string; updated_at: string }
        Insert: { avatar_url?: string | null; created_at?: string; email?: string | null; id: string; name?: string; updated_at?: string }
        Update: { avatar_url?: string | null; created_at?: string; email?: string | null; id?: string; name?: string; updated_at?: string }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          active: boolean; amount: number; category: string; created_at: string; description: string
          end_date: string | null; frequency: string; group_id: string; id: string
          next_due_date: string; note: string | null; paid_by: string; split_method: string
          start_date: string; updated_at: string
        }
        Insert: {
          active?: boolean; amount: number; category?: string; created_at?: string; description: string
          end_date?: string | null; frequency: string; group_id: string; id?: string
          next_due_date: string; note?: string | null; paid_by: string; split_method: string
          start_date: string; updated_at?: string
        }
        Update: {
          active?: boolean; amount?: number; category?: string; created_at?: string; description?: string
          end_date?: string | null; frequency?: string; group_id?: string; id?: string
          next_due_date?: string; note?: string | null; paid_by?: string; split_method?: string
          start_date?: string; updated_at?: string
        }
        Relationships: []
      }
      recurring_participants: {
        Row: { amount_owed: number; input_value: number | null; member_id: string; position: number; recurring_id: string }
        Insert: { amount_owed: number; input_value?: number | null; member_id: string; position: number; recurring_id: string }
        Update: { amount_owed?: number; input_value?: number | null; member_id?: string; position?: number; recurring_id?: string }
        Relationships: [
          {
            foreignKeyName: "recurring_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_participants_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number; created_at: string; date: string; from_member: string; group_id: string
          id: string; note: string | null; to_member: string; updated_at: string
        }
        Insert: {
          amount: number; created_at?: string; date: string; from_member: string; group_id: string
          id?: string; note?: string | null; to_member: string; updated_at?: string
        }
        Update: {
          amount?: number; created_at?: string; date?: string; from_member?: string; group_id?: string
          id?: string; note?: string | null; to_member?: string; updated_at?: string
        }
        Relationships: []
      }
      user_recovery: {
        Row: {
          answer_1_hash: string; answer_2_hash: string; created_at: string; failed_attempts: number
          locked_until: string | null; question_1: string; question_2: string; updated_at: string; user_id: string
        }
        Insert: {
          answer_1_hash: string; answer_2_hash: string; created_at?: string; failed_attempts?: number
          locked_until?: string | null; question_1: string; question_2: string; updated_at?: string; user_id: string
        }
        Update: {
          answer_1_hash?: string; answer_2_hash?: string; created_at?: string; failed_attempts?: number
          locked_until?: string | null; question_1?: string; question_2?: string; updated_at?: string; user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group: { Args: { p_currency: string; p_name: string; p_owner_name?: string }; Returns: string }
      dashboard_activity: {
        Args: { p_limit?: number }
        Returns: {
          entry_id: string
          kind: string
          group_id: string
          group_name: string
          currency: string
          description: string | null
          amount: number
          entry_date: string
          actor_name: string
          other_name: string | null
          category: string | null
          created_at: string
        }[]
      }
      dashboard_groups: {
        Args: Record<PropertyKey, never>
        Returns: {
          group_id: string
          name: string
          currency: string
          member_count: number
          expense_count: number
          total_spend: number
          my_balance: number
          last_activity: string | null
        }[]
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      normalise_recovery_answer: { Args: { p_answer: string }; Returns: string }
      recovery_questions_for_email: {
        Args: { p_email: string }
        Returns: { question_1: string; question_2: string }[]
      }
      revoke_all_sessions: { Args: { p_user_id: string }; Returns: undefined }
      save_expense: {
        Args: {
          p_amount: number; p_category: string; p_date: string; p_description: string
          p_expense_id?: string; p_group_id: string; p_note?: string; p_paid_by: string
          p_participants: Json; p_recurring_expense_id?: string; p_split_method: string
        }
        Returns: string
      }
      save_recurring_expense: {
        Args: {
          p_active?: boolean; p_amount: number; p_category: string; p_description: string
          p_end_date?: string; p_frequency: string; p_group_id: string; p_next_due_date: string
          p_note?: string; p_paid_by: string; p_participants: Json; p_recurring_id?: string
          p_split_method: string; p_start_date: string
        }
        Returns: string
      }
      set_recovery_questions: {
        Args: { p_answer_1: string; p_answer_2: string; p_question_1: string; p_question_2: string }
        Returns: undefined
      }
      verify_recovery_answers: {
        Args: { p_answer_1: string; p_answer_2: string; p_email: string }
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
