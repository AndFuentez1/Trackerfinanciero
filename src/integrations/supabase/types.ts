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
      budgets: {
        Row: {
          amount: number
          category: string
          category_id?: string // Added manually to reflect migration
          created_at: string
          id: string
          month: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          category_id?: string
          created_at?: string
          id?: string
          month: string
          period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          created_at: string
          name: string
          user_id: string
          type: string
          icon: string | null
          color: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          user_id: string
          type: string
          icon?: string | null
          color?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          user_id?: string
          type?: string
          icon?: string | null
          color?: string | null
        }
        Relationships: []
      }
      future_expenses: {
        Row: {
          id: string
          created_at: string
          payment_date: string
          amount: number
          description: string
          category_id: string | null
          user_id: string
          status: string
          is_subscription: boolean | null
          frequency: string | null
          payment_day: number | null
          start_date: string | null
          end_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          payment_date: string
          amount: number
          description: string
          category_id?: string | null
          user_id: string
          status?: string
          is_subscription?: boolean | null
          frequency?: string | null
          payment_day?: number | null
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          payment_date?: string
          amount?: number
          description?: string
          category_id?: string | null
          user_id?: string
          status?: string
          is_subscription?: boolean | null
          frequency?: string | null
          payment_day?: number | null
          start_date?: string | null
          end_date?: string | null
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          id: string
          loan_id: string
          amount: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          loan_id: string
          amount: number
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          loan_id?: string
          amount?: number
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          id: string
          user_id: string
          name: string
          total_amount: number
          paid_amount: number
          interest_rate: number
          due_date: string | null
          payment_method_id: string | null
          type: string
          is_disbursed: boolean
          installments: number | null
          created_at: string
          updated_at: string
          source_message_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          total_amount: number
          paid_amount?: number
          interest_rate?: number
          due_date?: string | null
          payment_method_id?: string | null
          type: string
          is_disbursed?: boolean
          installments?: number | null
          created_at?: string
          updated_at?: string
          source_message_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          total_amount?: number
          paid_amount?: number
          interest_rate?: number
          due_date?: string | null
          payment_method_id?: string | null
          type?: string
          is_disbursed?: boolean
          installments?: number | null
          created_at?: string
          updated_at?: string
          source_message_id?: string | null
        }
        Relationships: []
      }
      gmail_message_status: {
        Row: {
          id: string
          user_id: string
          message_id: string
          status: string
          read_at: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message_id: string
          status?: string
          read_at?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message_id?: string
          status?: string
          read_at?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_invoices: {
        Row: {
          id: string
          created_at: string
          arrival_date: string
          amount: number
          description: string
          category: string | null
          category_id: string | null
          message_id: string | null
          source: string | null
          status: string
          user_id: string
          date: string | null
          payment_method_id: string | null
          type: string
        }
        Insert: {
          id?: string
          created_at?: string
          arrival_date?: string
          amount: number
          description: string
          category?: string | null
          category_id?: string | null
          message_id?: string | null
          source?: string | null
          status?: string
          user_id: string
          date?: string | null
          payment_method_id?: string | null
          type?: string
        }
        Update: {
          id?: string
          created_at?: string
          arrival_date?: string
          amount?: number
          description?: string
          category?: string | null
          category_id?: string | null
          message_id?: string | null
          source?: string | null
          status?: string
          user_id?: string
          date?: string | null
          payment_method_id?: string | null
          type?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          balance: number
          created_at: string
          credit_limit: number | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
          is_savings_account: boolean | null
          savings_goal: number | null
          estimated_yield: number | null
          closing_date: number | null
          payment_day: number | null
          color: string | null
          initial_date: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          credit_limit?: number | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
          is_savings_account?: boolean | null
          savings_goal?: number | null
          estimated_yield?: number | null
          closing_date?: number | null
          payment_day?: number | null
          color?: string | null
          initial_date?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          credit_limit?: number | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
          is_savings_account?: boolean | null
          savings_goal?: number | null
          estimated_yield?: number | null
          closing_date?: number | null
          payment_day?: number | null
          color?: string | null
          initial_date?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string | null
          display_name: string | null
          id: string
          pin_hash: string | null
          updated_at: string
          user_id: string
          onboarding_decision: string | null
          has_pending_import: boolean | null
          welcome_completed: boolean | null
          email: string | null
          type: string | null
          profile_type: string | null
          decimal_places: number | null
          base_color: string | null
          keep_session_alive: boolean | null
          country: string | null
          data_treatment_accepted: boolean | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          display_name?: string | null
          id?: string
          pin_hash?: string | null
          updated_at?: string
          user_id: string
          onboarding_decision?: string | null
          has_pending_import?: boolean | null
          welcome_completed?: boolean | null
          email?: string | null
          type?: string | null
          profile_type?: string | null
          decimal_places?: number | null
          base_color?: string | null
          keep_session_alive?: boolean | null
          country?: string | null
          data_treatment_accepted?: boolean | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          display_name?: string | null
          id?: string
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
          onboarding_decision?: string | null
          has_pending_import?: boolean | null
          welcome_completed?: boolean | null
          email?: string | null
          type?: string | null
          profile_type?: string | null
          decimal_places?: number | null
          base_color?: string | null
          keep_session_alive?: boolean | null
          country?: string | null
          data_treatment_accepted?: boolean | null
        }
        Relationships: []
      }
      savings_accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          interest_rate: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          interest_rate?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          interest_rate?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          savings_account_id: string | null
          payment_method_id: string | null
          type: string
          user_id: string
          calculated_yield: number | null
          balance_after_transaction: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          savings_account_id?: string | null
          payment_method_id?: string | null
          type: string
          user_id: string
          calculated_yield?: number | null
          balance_after_transaction?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          savings_account_id?: string | null
          payment_method_id?: string | null
          type?: string
          user_id?: string
          calculated_yield?: number | null
          balance_after_transaction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_savings_account_id_fkey"
            columns: ["savings_account_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          payment_method_id: string | null
          type: string
          category_id: string | null // Added manually to reflect migration
          updated_at: string
          user_id: string
          calculated_yield_amount: number | null
          balance_at_transaction: number | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          payment_method_id?: string | null
          type: string
          category_id?: string | null
          updated_at?: string
          user_id: string
          calculated_yield_amount?: number | null
          balance_at_transaction?: number | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          payment_method_id?: string | null
          type?: string
          category_id?: string | null
          updated_at?: string
          user_id?: string
          calculated_yield_amount?: number | null
          balance_at_transaction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_import_duplicates: {
        Args: {
          p_user_id: string
          p_rows: Json
        }
        Returns: {
          row_index: number
        }[]
      }
      mark_staging_duplicates: {
        Args: {
          p_user_id: string
        }
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
