import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { CommunityCard } from "@/components/CommunityCard";
import { Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { CreateCommunityDialog } from "@/components/CreateCommunityDialog";

interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
}

interface DiscoverProps {
  user: User | null;
}

export default function Discover({ user }: DiscoverProps) {
  const { t, language } = useI18n();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = useCallback(async () => {
    // Fetch all public communities
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, description, cover_image_url, member_count")
      .eq("visibility", "public")
      .order("member_count", { ascending: false });

    if (!error && data) {
      setCommunities(data);
    }
  }, []);

  const fetchMyCommunities = useCallback(async () => {
    if (!user) {
      setMyCommunities([]);
      return;
    }

    // Fetch community IDs user is a member of
    const { data: memberData, error: memberError } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id);

    if (memberError || !memberData || memberData.length === 0) {
      setMyCommunities([]);
      return;
    }

    const communityIds = memberData.map((m) => m.community_id);

    // Fetch community details
    const { data: communitiesData, error: communitiesError } = await supabase
      .from("communities")
      .select("id, name, description, cover_image_url, member_count")
      .in("id", communityIds)
      .order("name");

    if (!communitiesError && communitiesData) {
      setMyCommunities(communitiesData);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCommunities(), fetchMyCommunities()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCommunities, fetchMyCommunities]);

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
        <CreateCommunityDialog
          user={user}
          onCommunityCreated={() => {
            fetchCommunities();
            fetchMyCommunities();
          }}
        />
      </div>

      {/* My Subscriptions - only for logged in users */}
      {user && myCommunities.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {language === "ru" ? "Мои подписки" : "My Subscriptions"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myCommunities.map((community) => (
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
      )}

      {/* Popular Communities */}
      <div>
        {user && myCommunities.length > 0 && (
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {language === "ru" ? "Популярные сообщества" : "Popular Communities"}
          </h2>
        )}
        {communities.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t("home.noCommunities")}</p>
            <p className="text-muted-foreground mt-2">{t("home.createFirst")}</p>
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
    </div>
  );
}
