export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'patient' | 'provider'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'patient' | 'provider'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'patient' | 'provider'
          created_at?: string
          updated_at?: string
        }
      }
      lab_results: {
        Row: {
          id: string
          patient_id: string
          provider_id: string | null
          name: string
          value: number
          unit: string
          reference_range: string
          status: 'normal' | 'high' | 'low'
          category: string
          date: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          provider_id?: string | null
          name: string
          value: number
          unit: string
          reference_range: string
          status: 'normal' | 'high' | 'low'
          category: string
          date: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          provider_id?: string | null
          name?: string
          value?: number
          unit?: string
          reference_range?: string
          status?: 'normal' | 'high' | 'low'
          category?: string
          date?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
