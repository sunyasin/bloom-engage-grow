import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UseGroupCallsAccessProps {
  userId: string | null;
  communityId: string;
}

export function useGroupCallsAccess({ userId, communityId }: UseGroupCallsAccessProps) {
  const [hasGroupCallsAccess, setHasGroupCallsAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !communityId) {
      setHasGroupCallsAccess(false);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      setLoading(true);

      try {
        // Get user's active membership in this community
        const { data: membership } = await supabase
          .from('memberships')
          .select('subscription_tier_id, status')
          .eq('user_id', userId)
          .eq('community_id', communityId)
          .eq('status', 'active')
          .maybeSingle();

        if (!membership?.subscription_tier_id) {
          // Check if user is community owner/moderator - they always have access
          const { data: communityMember } = await supabase
            .from('community_members')
            .select('role')
            .eq('user_id', userId)
            .eq('community_id', communityId)
            .maybeSingle();

          if (communityMember?.role === 'owner' || communityMember?.role === 'moderator') {
            setHasGroupCallsAccess(true);
          } else {
            setHasGroupCallsAccess(false);
          }
          setLoading(false);
          return;
        }

        // Get the subscription tier features
        const { data: tier } = await supabase
          .from('subscription_tiers')
          .select('features')
          .eq('id', membership.subscription_tier_id)
          .maybeSingle();

        if (tier?.features) {
          const features = Array.isArray(tier.features) ? tier.features : [];
          setHasGroupCallsAccess(features.includes('group_calls'));
        } else {
          setHasGroupCallsAccess(false);
        }
      } catch (error) {
        console.error('Error checking group calls access:', error);
        setHasGroupCallsAccess(false);
      }

      setLoading(false);
    };

    checkAccess();
  }, [userId, communityId]);

  return { hasGroupCallsAccess, loading };
}
