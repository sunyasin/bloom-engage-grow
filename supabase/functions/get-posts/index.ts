import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Post {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
}

interface PublicProfile {
  id: string;
  real_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  level: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching posts...');
    
    // Fetch all posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      throw postsError;
    }

    console.log(`Found ${posts?.length || 0} posts`);

    // Get unique user IDs
    const userIds = [...new Set(posts?.map((post: Post) => post.user_id) || [])];
    
    console.log(`Fetching profiles for ${userIds.length} users...`);

    // Fetch public profiles using the security definer function
    const { data: profiles, error: profilesError } = await supabase
      .rpc('get_public_profiles', { profile_ids: userIds });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Create a map of profiles by user ID
    const profileMap = new Map<string, PublicProfile>();
    profiles?.forEach((profile: PublicProfile) => {
      profileMap.set(profile.id, profile);
    });

    // Combine posts with profile data
    const postsWithProfiles = posts?.map((post: Post) => ({
      ...post,
      profiles: profileMap.get(post.user_id) || null,
    }));

    console.log('Successfully combined posts with profiles');

    return new Response(
      JSON.stringify({ data: postsWithProfiles, error: null }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in get-posts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ data: null, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
