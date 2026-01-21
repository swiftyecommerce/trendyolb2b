import { createClient } from '@supabase/supabase-js';

// Frontend public keys (Safe to expose if RLS is enabled, but here we disabled RLS for simplicity)
// The user provided these in the screenshot/chat earlier.
const SUPABASE_URL = 'https://btmofcirhoremttsmawo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tVL-lyL-mDIzwy_iDWmVoQ_59IXBPyf'; // Using the publishable key for frontend

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
