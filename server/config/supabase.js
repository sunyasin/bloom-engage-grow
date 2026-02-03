// import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';

// dotenv.config();

// const supabaseUrl = process.env.VITE_SUPABASE_URL;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// if (!supabaseUrl || !supabaseServiceRoleKey) {
//   throw new Error('Missing Supabase credentials');
// }

// export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// });

import { createClient } from "@supabase/supabase-js";
//import type { Database } from "@/integrations/supabase/types";
 import dotenv from 'dotenv';

dotenv.config();
// NOTE: Lovable Cloud injects VITE_* vars at build time. In rare preview/build glitches
// these may be undefined, causing a blank screen. We keep safe publishable fallbacks.
const FALLBACK_URL = "https://njrhaqycomfsluefnkec.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qcmhhcXljb21mc2x1ZWZua2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDEzNjcsImV4cCI6MjA4MDE3NzM2N30.9T-IK7g_c71yrL41xDANnslmqVIh2eLnf_uVuInnIfc";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY;

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    //storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
