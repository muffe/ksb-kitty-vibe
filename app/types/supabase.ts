export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      room_feeding_history: {
        Row: {
          created_at: string
          created_by: string | null
          daypart: string
          dry_food: string
          id: string
          medicine: string
          room_id: string
          wet_food: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daypart: string
          dry_food?: string
          id?: string
          medicine?: string
          room_id: string
          wet_food?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daypart?: string
          dry_food?: string
          id?: string
          medicine?: string
          room_id?: string
          wet_food?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_feeding_history_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          }
        ]
      }
      room_logs: {
        Row: {
          ate_all_food: boolean
          comment: string | null
          created_at: string
          created_by: string | null
          daypart: string
          employee_name: string
          id: string
          no_stool_found: boolean
          room_id: string
          stool_almost_firm: number
          stool_firm: number
          stool_mixed: number
          stool_mushy: number
          stool_soft: number
          stool_watery: number
        }
        Insert: {
          ate_all_food?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string | null
          daypart: string
          employee_name: string
          id?: string
          no_stool_found?: boolean
          room_id: string
          stool_almost_firm?: number
          stool_firm?: number
          stool_mixed?: number
          stool_mushy?: number
          stool_soft?: number
          stool_watery?: number
        }
        Update: {
          ate_all_food?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string | null
          daypart?: string
          employee_name?: string
          id?: string
          no_stool_found?: boolean
          room_id?: string
          stool_almost_firm?: number
          stool_firm?: number
          stool_mixed?: number
          stool_mushy?: number
          stool_soft?: number
          stool_watery?: number
        }
        Relationships: [
          {
            foreignKeyName: 'room_logs_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          }
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string | null
          evening_dry_food: string
          evening_medicine: string
          evening_wet_food: string
          id: string
          morning_dry_food: string
          morning_medicine: string
          morning_wet_food: string
          name: string
          number: string | null
          sort_order: number
          updated_at: string
          warning_info: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          evening_dry_food?: string
          evening_medicine?: string
          evening_wet_food?: string
          id?: string
          morning_dry_food?: string
          morning_medicine?: string
          morning_wet_food?: string
          name: string
          number?: string | null
          sort_order?: number
          updated_at?: string
          warning_info?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          evening_dry_food?: string
          evening_medicine?: string
          evening_wet_food?: string
          id?: string
          morning_dry_food?: string
          morning_medicine?: string
          morning_wet_food?: string
          name?: string
          number?: string | null
          sort_order?: number
          updated_at?: string
          warning_info?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
