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
import dotenv from 'dotenv';

dotenv.config();

// Lovable Cloud injects VITE_* vars at build time
const FALLBACK_URL = "https://njrhaqycomfsluefnkec.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qcmhhcXljb21mc2x1ZWZua2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDEzNjcsImV4cCI6MjA4MDE3NzM2N30.9T-IK7g_c71yrL41xDANnslmqVIh2eLnf_uVuInnIfc";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client with Service Role для Storage операций
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? (() => {
      console.log('[Supabase] Initializing admin client with Service Role');
      return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    })()
  : (() => {
      console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not found - admin client is null');
      return null;
    })();

// Publishable client для клиентской части
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
