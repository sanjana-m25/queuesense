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
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          hospital_id: string
          id: string
          metadata: Json | null
          target_appointment_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          hospital_id: string
          id?: string
          metadata?: Json | null
          target_appointment_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          hospital_id?: string
          id?: string
          metadata?: Json | null
          target_appointment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_target_appointment_id_fkey"
            columns: ["target_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      available_slots: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          doctor_id: string
          duration_minutes: number
          hospital_id: string
          id: string
          is_booked: boolean
          slot_date: string
          slot_time: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          doctor_id: string
          duration_minutes?: number
          hospital_id: string
          id?: string
          is_booked?: boolean
          slot_date: string
          slot_time: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          doctor_id?: string
          duration_minutes?: number
          hospital_id?: string
          id?: string
          is_booked?: boolean
          slot_date?: string
          slot_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "available_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "available_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "available_slots_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          arrived_at: string | null
          consent_notified_at: string | null
          created_at: string | null
          doctor_id: string
          hospital_id: string
          id: string
          original_position: number
          patient_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          booked_via: string
          symptoms: string | null
        }
        Insert: {
          arrived_at?: string | null
          consent_notified_at?: string | null
          created_at?: string | null
          doctor_id: string
          hospital_id: string
          id?: string
          original_position: number
          patient_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          booked_via?: string
          symptoms?: string | null
        }
        Update: {
          arrived_at?: string | null
          consent_notified_at?: string | null
          created_at?: string | null
          doctor_id?: string
          hospital_id?: string
          id?: string
          original_position?: number
          patient_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          booked_via?: string
          symptoms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          appointment_id: string
          doctor_id: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          started_at: string
        }
        Insert: {
          appointment_id: string
          doctor_id: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at: string
        }
        Update: {
          appointment_id?: string
          doctor_id?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          avg_consultation_minutes: number | null
          created_at: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          avg_consultation_minutes?: number | null
          created_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          avg_consultation_minutes?: number | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          timezone: string
          settings: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          timezone?: string
          settings?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          timezone?: string
          settings?: Json | null
        }
        Relationships: []
      }
      patient_consent_tokens: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          appointment_id: string
          created_at: string | null
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          appointment_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          appointment_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consent_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_locations: {
        Row: {
          accuracy_meters: number | null
          appointment_id: string
          created_at: string | null
          eta_seconds: number | null
          id: string
          lat: number
          lng: number
          patient_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          appointment_id: string
          created_at?: string | null
          eta_seconds?: number | null
          id?: string
          lat: number
          lng: number
          patient_id: string
        }
        Update: {
          accuracy_meters?: number | null
          appointment_id?: string
          created_at?: string | null
          eta_seconds?: number | null
          id?: string
          lat?: number
          lng?: number
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_locations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_locations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string | null
          eta_seconds: number | null
          eta_status: string
          eta_updated_at: string | null
          hospital_id: string
          id: string
          name: string
          phone: string
          age: number | null
          is_self_registered: boolean | null
        }
        Insert: {
          created_at?: string | null
          eta_seconds?: number | null
          eta_status?: string
          eta_updated_at?: string | null
          hospital_id: string
          id?: string
          name: string
          phone: string
          age?: number | null
          is_self_registered?: boolean | null
        }
        Update: {
          created_at?: string | null
          eta_seconds?: number | null
          eta_status?: string
          eta_updated_at?: string | null
          hospital_id?: string
          id?: string
          name?: string
          phone?: string
          age?: number | null
          is_self_registered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_entries: {
        Row: {
          appointment_id: string
          doctor_id: string
          id: string
          is_locked: boolean | null
          last_recalc_at: string | null
          position: number
          queue_date: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          doctor_id: string
          id?: string
          is_locked?: boolean | null
          last_recalc_at?: string | null
          position: number
          queue_date: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          doctor_id?: string
          id?: string
          is_locked?: boolean | null
          last_recalc_at?: string | null
          position?: number
          queue_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string | null
          doctor_id: string
          eta_seconds: number | null
          hospital_id: string
          id: string
          patient_id: string
          status: string
          urgency_level: string
          waitlist_date: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          eta_seconds?: number | null
          hospital_id: string
          id?: string
          patient_id: string
          status?: string
          urgency_level?: string
          waitlist_date: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          eta_seconds?: number | null
          hospital_id?: string
          id?: string
          patient_id?: string
          status?: string
          urgency_level?: string
          waitlist_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purge_stale_patient_locations: { Args: never; Returns: undefined }
      update_doctor_avg_consultation: {
        Args: { p_doctor_id: string }
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
