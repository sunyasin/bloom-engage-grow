import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GalleryStrip } from '@/components/GalleryStrip';
import { Loader2 } from 'lucide-react';

interface CommunityGalleriesTabProps {
  communityId: string;
  communityType: 'shop' | 'gallery';
  language: string;
}

interface Collection {
  id: number;
  name: string;
  thumbnail_url: string | null;
  year: number;
  user_id: string;
  updated_at: string;
}

interface ShopCollection {
  id: number;
  name: string;
  thumbnail_url: string | null;
  year: number;
  user_id: string;
  updated_at: string;
}

interface Participant {
  user_id: string;
  real_name: string | null;
  avatar_url: string | null;
}

export function CommunityGalleriesTab({ communityId, communityType, language }: CommunityGalleriesTabProps) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [collectionsByParticipant, setCollectionsByParticipant] = useState<Record<string, Collection[]>>({});
  const [shops, setShops] = useState<ShopCollection[]>([]);

  useEffect(() => {
    fetchData();
  }, [communityId, communityType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (communityType === 'gallery') {
        // For gallery type - group collections by participant
        const { data: membersData } = await supabase
          .from('community_members')
          .select('user_id')
          .eq('community_id', communityId)
          .eq('is_active', true);

        if (!membersData || membersData.length === 0) {
          setLoading(false);
          return;
        }

        const userIds = membersData.map(m => m.user_id);

        // Fetch profiles for participants
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, real_name, avatar_url')
          .in('id', userIds);

        const participantsList: Participant[] = profilesData?.map(p => ({
          user_id: p.id,
          real_name: p.real_name,
          avatar_url: p.avatar_url,
        })) || [];

        setParticipants(participantsList);

        // Fetch collections for all participants
        const { data: collectionsData } = await supabase
          .from('gallery_collections')
          .select('id, name, thumbnail_url, year, user_id, updated_at')
          .in('user_id', userIds)
          .eq('community_id', communityId)
          .order('updated_at', { ascending: false });

        if (collectionsData) {
          const grouped: Record<string, Collection[]> = {};
          collectionsData.forEach((collection) => {
            if (!grouped[collection.user_id]) {
              grouped[collection.user_id] = [];
            }
            grouped[collection.user_id].push(collection);
          });
          setCollectionsByParticipant(grouped);
        }
      } else {
        // For shop type - show shops (collections with thumbnail)
        const { data: shopsData } = await supabase
          .from('gallery_collections')
          .select('id, name, thumbnail_url, year, user_id, updated_at')
          .eq('community_id', communityId)
          .not('thumbnail_url', 'is', null)
          .order('updated_at', { ascending: false });

        setShops(shopsData || []);
      }
    } catch (error) {
      console.error('Error fetching gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (communityType === 'gallery') {
    // Render galleries by participant
    return (
      <div className="space-y-8">
        {participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ru' ? 'Нет участников с галереями' : 'No participants with galleries'}
          </div>
        ) : (
          participants.map((participant) => {
            const collections = collectionsByParticipant[participant.user_id] || [];
            if (collections.length === 0) return null;

            return (
              <GalleryStrip
                key={participant.user_id}
                title={participant.real_name || (language === 'ru' ? 'Участник' : 'Participant')}
                items={collections.map(c => ({
                  id: c.id,
                  thumbnail_url: c.thumbnail_url,
                  name: c.name,
                  updated_at: c.updated_at,
                }))}
                language={language}
                onItemClick={(id) => {
                  // Navigate to collection detail
                  console.log('Collection clicked:', id);
                }}
              />
            );
          })
        )}
      </div>
    );
  }

  // Render shops
  return (
    <div className="space-y-8">
      {shops.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {language === 'ru' ? 'Нет магазинов' : 'No shops'}
        </div>
      ) : (
        <GalleryStrip
          title={language === 'ru' ? 'Магазины' : 'Shops'}
          items={shops.map(s => ({
            id: s.id,
            thumbnail_url: s.thumbnail_url,
            name: s.name,
            updated_at: s.updated_at,
          }))}
          language={language}
          onItemClick={(id) => {
            // Navigate to shop/collection detail
            console.log('Shop clicked:', id);
          }}
        />
      )}
    </div>
  );
}
