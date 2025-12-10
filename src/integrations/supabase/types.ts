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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      carrier_base_rates: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          currency: string
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          is_active: boolean
          min_price: number
          price_per_kg: number
          service_name: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          currency?: string
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          min_price?: number
          price_per_kg?: number
          service_name?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          currency?: string
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          min_price?: number
          price_per_kg?: number
          service_name?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          is_recurring: boolean
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date: string
          expense_type: string
          id?: string
          is_recurring?: boolean
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          is_recurring?: boolean
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financial_events: {
        Row: {
          amount: number
          created_at: string | null
          event_date: string
          event_type: string
          fees_lost: number | null
          gateway: string | null
          id: string
          notes: string | null
          order_id: string | null
          reason: string | null
          shopify_transaction_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          event_date: string
          event_type: string
          fees_lost?: number | null
          gateway?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          shopify_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          event_date?: string
          event_type?: string
          fees_lost?: number | null
          gateway?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          shopify_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_summaries: {
        Row: {
          created_at: string
          gross_profit: number
          id: string
          month: number
          net_profit: number
          orders_count: number
          total_cost: number
          total_expenses: number
          total_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          gross_profit?: number
          id?: string
          month: number
          net_profit?: number
          orders_count?: number
          total_cost?: number
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          gross_profit?: number
          id?: string
          month?: number
          net_profit?: number
          orders_count?: number
          total_cost?: number
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      order_line_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_title: string
          quantity: number
          shopify_line_item_id: string
          sku: string | null
          total_cost: number
          total_price: number
          unit_cost: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price?: number
          product_id?: string | null
          product_title: string
          quantity?: number
          shopify_line_item_id: string
          sku?: string | null
          total_cost?: number
          total_price?: number
          unit_cost?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_title?: string
          quantity?: number
          shopify_line_item_id?: string
          sku?: string | null
          total_cost?: number
          total_price?: number
          unit_cost?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          adjusted_profit: number | null
          adjusted_revenue: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          chargeback_amount: number | null
          created_at: string
          currency: string
          currency_conversion_fee: number | null
          customer_email: string | null
          customer_name: string | null
          dispute_amount: number | null
          domestic_processing_fee: number | null
          fee_details: Json | null
          fee_source: string | null
          financial_status: string | null
          fulfillment_status: string | null
          gateway: string | null
          id: string
          international_processing_fee: number | null
          is_cancelled: boolean | null
          is_chargeback: boolean | null
          is_refunded: boolean | null
          lost_fees: number | null
          margin_percentage: number
          order_date: string
          order_number: string
          other_fees: number
          payout_date: string | null
          payout_id: string | null
          product_cost: number
          profit: number
          refund_amount: number | null
          second_invoice: number
          shipping_price: number
          shopify_order_id: string
          subtotal_price: number
          total_cost: number
          total_discounts: number
          total_financial_loss: number | null
          total_price: number
          total_refunded: number | null
          total_tax: number
          updated_at: string
          void_amount: number | null
        }
        Insert: {
          adjusted_profit?: number | null
          adjusted_revenue?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          chargeback_amount?: number | null
          created_at?: string
          currency?: string
          currency_conversion_fee?: number | null
          customer_email?: string | null
          customer_name?: string | null
          dispute_amount?: number | null
          domestic_processing_fee?: number | null
          fee_details?: Json | null
          fee_source?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          gateway?: string | null
          id?: string
          international_processing_fee?: number | null
          is_cancelled?: boolean | null
          is_chargeback?: boolean | null
          is_refunded?: boolean | null
          lost_fees?: number | null
          margin_percentage?: number
          order_date: string
          order_number: string
          other_fees?: number
          payout_date?: string | null
          payout_id?: string | null
          product_cost?: number
          profit?: number
          refund_amount?: number | null
          second_invoice?: number
          shipping_price?: number
          shopify_order_id: string
          subtotal_price?: number
          total_cost?: number
          total_discounts?: number
          total_financial_loss?: number | null
          total_price?: number
          total_refunded?: number | null
          total_tax?: number
          updated_at?: string
          void_amount?: number | null
        }
        Update: {
          adjusted_profit?: number | null
          adjusted_revenue?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          chargeback_amount?: number | null
          created_at?: string
          currency?: string
          currency_conversion_fee?: number | null
          customer_email?: string | null
          customer_name?: string | null
          dispute_amount?: number | null
          domestic_processing_fee?: number | null
          fee_details?: Json | null
          fee_source?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          gateway?: string | null
          id?: string
          international_processing_fee?: number | null
          is_cancelled?: boolean | null
          is_chargeback?: boolean | null
          is_refunded?: boolean | null
          lost_fees?: number | null
          margin_percentage?: number
          order_date?: string
          order_number?: string
          other_fees?: number
          payout_date?: string | null
          payout_id?: string | null
          product_cost?: number
          profit?: number
          refund_amount?: number | null
          second_invoice?: number
          shipping_price?: number
          shopify_order_id?: string
          subtotal_price?: number
          total_cost?: number
          total_discounts?: number
          total_financial_loss?: number | null
          total_price?: number
          total_refunded?: number | null
          total_tax?: number
          updated_at?: string
          void_amount?: number | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          date: string
          id: string
          shopify_payout_id: string
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          date: string
          id?: string
          shopify_payout_id: string
          status: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          date?: string
          id?: string
          shopify_payout_id?: string
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_rate_changes: {
        Row: {
          created_at: string
          currency: string
          current_price: number
          id: string
          notes: string | null
          proposed_by: string
          proposed_price: number
          proposed_rate_name: string | null
          rate_id: string
          rate_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          zone_id: string
          zone_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_price: number
          id?: string
          notes?: string | null
          proposed_by?: string
          proposed_price: number
          proposed_rate_name?: string | null
          rate_id: string
          rate_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          zone_id: string
          zone_name: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_price?: number
          id?: string
          notes?: string | null
          proposed_by?: string
          proposed_price?: number
          proposed_rate_name?: string | null
          rate_id?: string
          rate_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          zone_id?: string
          zone_name?: string
        }
        Relationships: []
      }
      rate_change_logs: {
        Row: {
          action: string
          created_at: string
          currency: string
          id: string
          new_price: number
          notes: string | null
          old_price: number
          performed_by: string
          rate_id: string
          rate_name: string
          zone_id: string
          zone_name: string
        }
        Insert: {
          action: string
          created_at?: string
          currency?: string
          id?: string
          new_price: number
          notes?: string | null
          old_price: number
          performed_by: string
          rate_id: string
          rate_name: string
          zone_id: string
          zone_name: string
        }
        Update: {
          action?: string
          created_at?: string
          currency?: string
          id?: string
          new_price?: number
          notes?: string | null
          old_price?: number
          performed_by?: string
          rate_id?: string
          rate_name?: string
          zone_id?: string
          zone_name?: string
        }
        Relationships: []
      }
      shipping_multipliers: {
        Row: {
          base_quantity: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          multiplier: number
          name: string
          updated_at: string
        }
        Insert: {
          base_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          updated_at?: string
        }
        Update: {
          base_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopify_rate_extras: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_days: string | null
          id: string
          max_weight: number | null
          min_weight: number | null
          rate_id: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          rate_id: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          rate_id?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      trigger_shopify_sync: { Args: never; Returns: undefined }
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
