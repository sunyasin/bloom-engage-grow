import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { CommunityCard } from '@/components/CommunityCard';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';

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
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyCommunities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: memberships, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      if (memberError || !memberships?.length) {
        setLoading(false);
        return;
      }

      const communityIds = memberships.map(m => m.community_id);
      
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, description, cover_image_url, member_count')
        .in('id', communityIds)
        .order('name');

      if (!error && data) {
        setCommunities(data);
      }
      setLoading(false);
    };

    fetchMyCommunities();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t('nav.myCommunities')}
        </h1>
      </div>
      
      {communities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">{t('home.noCommunities')}</p>
          <Button 
            className="mt-4 bg-gradient-primary"
            onClick={() => window.location.href = '/discover'}
          >
            {t('nav.communities')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {communities.map((community) => (
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
      )}
    </div>
  );
}
