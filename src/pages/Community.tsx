import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, Pin, MessageSquare, Send, Loader2, Settings, SlidersHorizontal } from 'lucide-react';
import { SubscriptionTiersManager } from '@/components/SubscriptionTiersManager';
import { CommunitySettingsDialog } from '@/components/CommunitySettingsDialog';
import { User } from '@supabase/supabase-js';
import { CoursesTab } from '@/components/CoursesTab';
import { CommunityReplyDialog } from '@/components/CommunityReplyDialog';
import { PostLikeButton } from '@/components/PostLikeButton';
import { CommunityEventsTab } from '@/components/CommunityEventsTab';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useCommunityTabs } from '@/contexts/CommunityTabsContext';

interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  creator_id: string;
}

interface Post {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  user?: {
    real_name: string | null;
    avatar_url: string | null;
  };
  reply_count?: number;
}

interface CommunityProps {
  user: User | null;
}

export default function Community({ user }: CommunityProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { activeTab, setActiveTab, setCommunityId, setTabs } = useCommunityTabs();
  
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [subscriptionSettingsOpen, setSubscriptionSettingsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [searchParams] = useSearchParams();

  // Set up community tabs in header
  useEffect(() => {
    if (id) {
      setCommunityId(id);
      setTabs([
        { value: 'feed', label: language === 'ru' ? 'Лента' : 'Feed' },
        { value: 'courses', label: language === 'ru' ? 'Курсы' : 'Courses' },
        { value: 'events', label: language === 'ru' ? 'События' : 'Events' },
        { value: 'members', label: language === 'ru' ? 'Участники' : 'Members' },
        { value: 'about', label: language === 'ru' ? 'О сообществе' : 'About' },
      ]);
      const tabParam = searchParams.get('tab');
      setActiveTab(tabParam && ['feed', 'courses', 'events', 'members', 'about'].includes(tabParam) ? tabParam : 'feed');
    }
    
    return () => {
      setCommunityId(null);
      setTabs([]);
    };
  }, [id, language, setCommunityId, setTabs, setActiveTab, searchParams]);

  const fetchCommunity = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setCommunity(data);
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    if (!id) return;

    const { data: postsData, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('community_id', id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && postsData) {
      // Fetch user profiles
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', { profile_ids: userIds });
      
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      
      // Fetch reply counts
      const { data: replyCounts } = await supabase
        .from('community_post_replies')
        .select('post_id')
        .in('post_id', postsData.map(p => p.id));

      const countMap: Record<string, number> = {};
      replyCounts?.forEach((r: { post_id: string }) => {
        countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
      });

      const postsWithUsers = postsData.map(post => ({
        ...post,
        user: profileMap.get(post.user_id) as any,
        reply_count: countMap[post.id] || 0
      }));

      setPosts(postsWithUsers);
    }
  };

  const checkMembership = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    setIsMember(!!data);
    setUserRole(data?.role || null);
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('rating, subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
    }
  };

  useEffect(() => {
    fetchCommunity();
    fetchPosts();
    checkMembership();
    fetchUserProfile();

    // Realtime subscription
    const channel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts', filter: `community_id=eq.${id}` }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const handleJoin = async () => {
    if (!user || !id) return;

    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: id, user_id: user.id });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setIsMember(true);
      setCommunity(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
      toast({ title: 'Success', description: 'You joined the community!' });
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;

    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setIsMember(false);
      setCommunity(prev => prev ? { ...prev, member_count: prev.member_count - 1 } : null);
    }
  };

  const handlePost = async () => {
    if (!user || !id || !newPost.trim()) return;

    setPosting(true);
    const { error } = await supabase
      .from('community_posts')
      .insert({ community_id: id, user_id: user.id, content: newPost.trim() });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewPost('');
    }
    setPosting(false);
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('community_posts')
      .update({ is_pinned: !isPinned })
      .eq('id', postId);

    if (!error) {
      fetchPosts();
    }
  };

  const isOwner = user?.id === community?.creator_id;

  const handleOpenReplyDialog = (post: Post) => {
    setSelectedPost(post);
    setReplyDialogOpen(true);
  };

  const handleCloseReplyDialog = () => {
    setReplyDialogOpen(false);
    setSelectedPost(null);
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-lg">Community not found</p>
      </div>
    );
  }

  const handleCommunityUpdate = (updated: { name: string; description: string | null; cover_image_url: string | null }) => {
    setCommunity(prev => prev ? { ...prev, ...updated } : null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Logo at top if exists */}
      {community.cover_image_url && (
        <div className="container mx-auto px-4 pt-6">
          <img 
            src={community.cover_image_url} 
            alt={community.name}
            className="h-16 w-auto object-contain"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          {/* Main content */}
          <div className="flex-1">
            {/* Feed Tab */}
            {activeTab === 'feed' && (
              <>
                {/* New post form */}
                {isMember && (
                  <div className="bg-card rounded-xl p-4 border border-border mb-6">
                    <Textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={t('community.writeSomething')}
                      className="min-h-[100px] resize-none mb-3"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handlePost} 
                        disabled={!newPost.trim() || posting}
                        className="bg-gradient-primary"
                      >
                        {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {t('community.post')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Posts */}
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-card rounded-xl p-4 border border-border">
                      {post.is_pinned && (
                        <div className="flex items-center gap-1 text-xs text-primary mb-2">
                          <Pin className="h-3 w-3" />
                          <span>{t('community.pinned')}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.user?.avatar_url || ''} />
                          <AvatarFallback>{post.user?.real_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {post.user?.real_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: language === 'ru' ? ru : enUS
                              })}
                            </span>
                          </div>
                          <p className="mt-2 text-foreground whitespace-pre-wrap">{post.content}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <PostLikeButton
                              postId={post.id}
                              userId={user?.id || null}
                              postAuthorId={post.user_id}
                              language={language}
                            />
                            <button
                              onClick={() => handleOpenReplyDialog(post)}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>{t('community.reply')}</span>
                              {post.reply_count && post.reply_count > 0 && (
                                <span className="ml-1">({post.reply_count})</span>
                              )}
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => handlePin(post.id, post.is_pinned)}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                              >
                                <Pin className="h-4 w-4" />
                                <span>{post.is_pinned ? t('community.unpin') : t('community.pin')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <CoursesTab
                communityId={id!}
                isOwner={isOwner}
                userId={user?.id}
                language={language}
                navigate={navigate}
              />
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <CommunityEventsTab
                communityId={id!}
                userId={user?.id || null}
                isOwnerOrModerator={userRole === 'owner' || userRole === 'moderator'}
                userRating={userProfile?.rating || 0}
                userTier={userProfile?.subscription_tier || null}
              />
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="text-center py-16 text-muted-foreground">
                Members list coming soon...
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold mb-4">{community.name}</h2>
                <p className="text-muted-foreground">{community.description || 'No description'}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="sticky top-24 bg-card rounded-xl p-6 border border-border">
              <h2 className="font-semibold text-lg text-foreground mb-2">{community.name}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <Users className="h-4 w-4" />
                <span>{community.member_count.toLocaleString()} {t('home.members')}</span>
              </div>
              {user && !isMember && (
                <Button onClick={handleJoin} className="w-full bg-gradient-primary">
                  {t('community.join')}
                </Button>
              )}
              {user && isMember && !isOwner && (
                <Button onClick={handleLeave} variant="outline" className="w-full">
                  {t('community.leave')}
                </Button>
              )}
              {isOwner && (
                <div className="space-y-2 mt-3">
                  <Button 
                    onClick={() => setSettingsOpen(true)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Настройки' : 'Settings'}
                  </Button>
                  <Button 
                    onClick={() => setSubscriptionSettingsOpen(true)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Настройки подписок' : 'Subscription Settings'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Community Settings Dialog */}
      {community && (
        <CommunitySettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          community={community}
          onUpdate={handleCommunityUpdate}
          language={language}
        />
      )}

      {/* Subscription Settings Manager */}
      {community && (
        <SubscriptionTiersManager
          open={subscriptionSettingsOpen}
          onOpenChange={setSubscriptionSettingsOpen}
          communityId={community.id}
        />
      )}

      {/* Reply Dialog */}
      <CommunityReplyDialog
        post={selectedPost}
        open={replyDialogOpen}
        onClose={handleCloseReplyDialog}
        userId={user?.id || null}
        language={language}
      />
    </div>
  );
}
