import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { CommunityCard } from '@/components/CommunityCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { CreateCommunityDialog } from '@/components/CreateCommunityDialog';
interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
}

interface MyCommunitiesProps {
  user: User | null;
}

export default function MyCommunities({ user }: MyCommunitiesProps) {
  const { t } = useI18n();
  const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([]);
  const [subscribedCommunities, setSubscribedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyCommunities = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: ownedData, error: ownedError } = await supabase
      .from('communities')
      .select('id, name, description, cover_image_url, member_count')
      .eq('creator_id', user.id)
      .order('name');

    if (!ownedError && ownedData) {
      setOwnedCommunities(ownedData);
    }

    const { data: memberships, error: memberError } = await supabase
      .from('community_members')
      .select('community_id, communities(id, name, description, cover_image_url, member_count, creator_id)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!memberError && memberships) {
      const subscribedData = memberships
        .filter(m => m.communities && m.communities.creator_id !== user.id)
        .map(m => m.communities as Community);
      setSubscribedCommunities(subscribedData);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMyCommunities();
  }, [fetchMyCommunities]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <CreateCommunityDialog user={user} onCommunityCreated={fetchMyCommunities} />
        <h1 className="text-3xl font-bold text-foreground">
          {t('nav.myCommunities')}
        </h1>
      </div>

      {ownedCommunities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-4">
            {t('lang') === 'ru' ? 'Создайте первое сообщество' : 'Create your first community'}
          </p>
          <CreateCommunityDialog user={user} onCommunityCreated={fetchMyCommunities} />
        </div>
      ) : (
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              {t('lang') === 'ru' ? 'Мои сообщества' : 'My Communities'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ownedCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  id={community.id}
                  name={community.name}
                  description={community.description}
                  coverImageUrl={community.cover_image_url}
                  memberCount={community.member_count}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
