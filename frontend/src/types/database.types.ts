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
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_type: Database['public']['Enums']['asset_type']
          created_at: string
          currency: string
          exchange: string | null
          icon_slug: string | null
          id: string
          isin: string | null
          name: string
          symbol: string
        }
        Insert: {
          asset_type: Database['public']['Enums']['asset_type']
          created_at?: string
          currency: string
          exchange?: string | null
          icon_slug?: string | null
          id?: string
          isin?: string | null
          name: string
          symbol: string
        }
        Update: {
          asset_type?: Database['public']['Enums']['asset_type']
          created_at?: string
          currency?: string
          exchange?: string | null
          icon_slug?: string | null
          id?: string
          isin?: string | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          exchange_rate_to_base: number
          executed_at: string
          from_entity_id: string | null
          id: string
          notes: string | null
          portfolio_id: string
          to_entity_id: string | null
          transaction_type: Database['public']['Enums']['cash_transaction_type']
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          exchange_rate_to_base?: number
          executed_at?: string
          from_entity_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id: string
          to_entity_id?: string | null
          transaction_type: Database['public']['Enums']['cash_transaction_type']
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          exchange_rate_to_base?: number
          executed_at?: string
          from_entity_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id?: string
          to_entity_id?: string | null
          transaction_type?: Database['public']['Enums']['cash_transaction_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cash_transactions_from_entity_id_fkey'
            columns: ['from_entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cash_transactions_portfolio_id_fkey'
            columns: ['portfolio_id']
            isOneToOne: false
            referencedRelation: 'portfolios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cash_transactions_to_entity_id_fkey'
            columns: ['to_entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      entities: {
        Row: {
          cash_balance_cache: number
          created_at: string
          currency: string
          icon_slug: string | null
          id: string
          name: string
          portfolio_id: string
          type: Database['public']['Enums']['entity_type']
          updated_at: string
        }
        Insert: {
          cash_balance_cache?: number
          created_at?: string
          currency: string
          icon_slug?: string | null
          id?: string
          name: string
          portfolio_id: string
          type: Database['public']['Enums']['entity_type']
          updated_at?: string
        }
        Update: {
          cash_balance_cache?: number
          created_at?: string
          currency?: string
          icon_slug?: string | null
          id?: string
          name?: string
          portfolio_id?: string
          type?: Database['public']['Enums']['entity_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entities_portfolio_id_fkey'
            columns: ['portfolio_id']
            isOneToOne: false
            referencedRelation: 'portfolios'
            referencedColumns: ['id']
          },
        ]
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          obtained_at: string
          rate: number
          to_currency: string
        }
        Insert: {
          from_currency: string
          id?: string
          obtained_at?: string
          rate: number
          to_currency: string
        }
        Update: {
          from_currency?: string
          id?: string
          obtained_at?: string
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          asset_id: string
          average_price: number
          created_at: string
          entity_id: string
          id: string
          invested_amount: number
          market_value_cache: number
          quantity: number
          unrealized_profit_cache: number
          updated_at: string
        }
        Insert: {
          asset_id: string
          average_price?: number
          created_at?: string
          entity_id: string
          id?: string
          invested_amount?: number
          market_value_cache?: number
          quantity?: number
          unrealized_profit_cache?: number
          updated_at?: string
        }
        Update: {
          asset_id?: string
          average_price?: number
          created_at?: string
          entity_id?: string
          id?: string
          invested_amount?: number
          market_value_cache?: number
          quantity?: number
          unrealized_profit_cache?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'holdings_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'holdings_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      investment_transactions: {
        Row: {
          asset_id: string
          created_at: string
          currency: string
          entity_id: string
          exchange_rate_to_base: number
          executed_at: string
          fees: number
          gross_amount: number
          id: string
          notes: string | null
          price_per_unit: number
          quantity: number
          remaining_quantity: number | null
          taxes: number
          transaction_type: Database['public']['Enums']['investment_transaction_type']
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          currency: string
          entity_id: string
          exchange_rate_to_base?: number
          executed_at?: string
          fees?: number
          gross_amount: number
          id?: string
          notes?: string | null
          price_per_unit: number
          quantity: number
          remaining_quantity?: number | null
          taxes?: number
          transaction_type: Database['public']['Enums']['investment_transaction_type']
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          currency?: string
          entity_id?: string
          exchange_rate_to_base?: number
          executed_at?: string
          fees?: number
          gross_amount?: number
          id?: string
          notes?: string | null
          price_per_unit?: number
          quantity?: number
          remaining_quantity?: number | null
          taxes?: number
          transaction_type?: Database['public']['Enums']['investment_transaction_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'investment_transactions_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'investment_transactions_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_entity: { Args: { p_entity_id: string }; Returns: boolean }
      user_owns_portfolio: {
        Args: { p_portfolio_id: string }
        Returns: boolean
      }
    }
    Enums: {
      asset_type:
        | 'STOCK'
        | 'ETF'
        | 'INDEX'
        | 'CRYPTO'
        | 'BOND'
        | 'FUND'
        | 'COMMODITY'
        | 'FOREX'
        | 'OTHER'
      cash_transaction_type:
        'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT'
      entity_type: 'BANK' | 'BROKER'
      investment_transaction_type: 'BUY' | 'SELL'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_type: [
        'STOCK',
        'ETF',
        'INDEX',
        'CRYPTO',
        'BOND',
        'FUND',
        'COMMODITY',
        'FOREX',
        'OTHER',
      ],
      cash_transaction_type: [
        'TRANSFER',
        'DEPOSIT',
        'WITHDRAWAL',
        'ADJUSTMENT',
      ],
      entity_type: ['BANK', 'BROKER'],
      investment_transaction_type: ['BUY', 'SELL'],
    },
  },
} as const
