import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function usePrivateChatAccess(communityId: string | null, userId: string | null) {
  const [hasPrivateChatAccess, setHasPrivateChatAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!communityId || !userId) {
        setHasPrivateChatAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is community owner (always has access)
        const { data: community } = await supabase
          .from('communities')
          .select('creator_id')
          .eq('id', communityId)
          .single();

        if (community?.creator_id === userId) {
          setHasPrivateChatAccess(true);
          setLoading(false);
          return;
        }

        // Check user's membership and tier
        const { data: membership } = await supabase
          .from('memberships')
          .select('subscription_tier_id')
          .eq('community_id', communityId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (!membership?.subscription_tier_id) {
          setHasPrivateChatAccess(false);
          setLoading(false);
          return;
        }

        // Check if tier has private_chat feature
        const { data: tier } = await supabase
          .from('subscription_tiers')
          .select('features')
          .eq('id', membership.subscription_tier_id)
          .single();

        if (tier) {
          const features = Array.isArray(tier.features) ? tier.features : [];
          setHasPrivateChatAccess(features.includes('private_chat'));
        } else {
          setHasPrivateChatAccess(false);
        }
      } catch (error) {
        console.error('Error checking private chat access:', error);
        setHasPrivateChatAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [communityId, userId]);

  return { hasPrivateChatAccess, loading };
}
