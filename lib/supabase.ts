import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist sessions on native via AsyncStorage (web uses localStorage by default).
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// profiles.role now also allows 'farmer' (see supabase/hapus-migrations).
export type UserRole = 'student' | 'admin' | 'farmer';

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
};

export type ScanSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ScanStage = 'leaf' | 'flower' | 'fruit' | 'trunk';

export type TreatmentOption = {
  type: 'chemical' | 'organic';
  medicine: string;
  dosage: string;
  frequency: string;
  notes: string;
};

export type Scan = {
  id: string;
  farmer_id: string;
  image_url: string | null;
  image_path: string | null;
  voice_text: string | null;
  is_healthy: boolean;
  disease_name_mr: string | null;
  disease_name_en: string | null;
  confidence: number | null;
  severity: ScanSeverity | null;
  stage: ScanStage | null;
  description_mr: string | null;
  treatment: TreatmentOption[] | null;
  prevention_mr: string[] | null;
  created_at: string;
};

export const SEVERITY_CONFIG: Record<
  ScanSeverity,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  low: {
    label: 'कमी',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    dotColor: '#9ca3af',
  },
  medium: {
    label: 'मध्यम',
    color: '#2563eb',
    bgColor: '#eff6ff',
    dotColor: '#3b82f6',
  },
  high: {
    label: 'जास्त',
    color: '#d97706',
    bgColor: '#fffbeb',
    dotColor: '#f59e0b',
  },
  critical: {
    label: 'तातडीचे',
    color: '#dc2626',
    bgColor: '#fef2f2',
    dotColor: '#ef4444',
  },
};

export const STAGE_CONFIG: Record<ScanStage, { label: string }> = {
  leaf: { label: 'पाने' },
  flower: { label: 'फुले' },
  fruit: { label: 'फळे' },
  trunk: { label: 'खोड' },
};
