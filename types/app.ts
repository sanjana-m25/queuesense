export type PatientEtaStatus = 'uncertain' | 'known' | 'arrived' | 'no_show';

export type UserRole = 'admin' | 'receptionist' | 'doctor';

export type AdminAction = 
  | 'OVERRIDE_POSITION' 
  | 'LOCK_POSITION' 
  | 'UNLOCK_POSITION' 
  | 'MARK_NO_SHOW' 
  | 'MARK_ARRIVED' 
  | 'WAITLIST_OFFER' 
  | 'WAITLIST_ACCEPT' 
  | 'WAITLIST_DECLINE' 
  | 'RECALC_INTERVAL_CHANGE' 
  | 'MANUAL_RECALC';

export interface QueueEntry {
  queue_entry_id: string;
  position: number;
  appointment_id: string;
  is_locked: boolean;
  last_recalc_at: string | null;
  patient: { id: string; name: string; phone: string };
  scheduled_time: string;
  scheduled_date: string;
  eta_status: PatientEtaStatus;
  eta_seconds: number | null;
  eta_minutes: number | null;
  appointment_status: string;
}

export interface WaitlistEntry {
  waitlist_entry_id: string;
  patient: { id: string; name: string; phone: string };
  urgency_level: 'low' | 'medium' | 'high';
  eta_seconds: number | null;
  status: 'waiting' | 'offered' | 'accepted' | 'declined' | 'expired';
  doctor_id: string;
  waitlist_date: string;
}

export interface QueueResponse {
  doctor_id: string;
  date: string;
  last_recalculated_at: string | null;
  recalc_interval_seconds: number;
  queue: QueueEntry[];
}
