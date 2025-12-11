import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { CommunityCard } from '@/components/CommunityCard';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
}

interface HomeProps {
  user: User | null;
}

export default function Home({ user }: HomeProps) {
  const { t } = useI18n();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, description, cover_image_url, member_count')
        .eq('visibility', 'public')
        .order('member_count', { ascending: false })
        .limit(12);

      if (!error && data) {
        setCommunities(data);
      }
      setLoading(false);
    };

    fetchCommunities();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="py-16 md:py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            {t('home.popularCommunities')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {user ? t('nav.myCommunities') : t('nav.communities')}
          </p>
        </div>
      </section>

      {/* Communities grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {communities.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t('home.noCommunities')}</p>
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
      </section>
    </div>
  );
}
