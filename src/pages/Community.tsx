import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Pin, MessageSquare, Send, Loader2, BookOpen } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

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
  
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

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
      .select('id')
      .eq('community_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    setIsMember(!!data);
  };

  useEffect(() => {
    fetchCommunity();
    fetchPosts();
    checkMembership();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Cover image */}
      <div className="h-48 md:h-64 bg-muted relative">
        {community.cover_image_url && (
          <img 
            src={community.cover_image_url} 
            alt={community.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8 -mt-8 relative">
          {/* Main content */}
          <div className="flex-1">
            <Tabs defaultValue="feed" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="feed">{t('community.feed')}</TabsTrigger>
                <TabsTrigger value="courses">{t('community.courses')}</TabsTrigger>
                <TabsTrigger value="members">{t('community.members')}</TabsTrigger>
                <TabsTrigger value="about">{t('community.about')}</TabsTrigger>
              </TabsList>

              <TabsContent value="feed">
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
                            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth">
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
              </TabsContent>

              <TabsContent value="courses">
                {isOwner ? (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => navigate(`/community/${id}/lessons`)}
                      className="bg-gradient-primary"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      {language === 'ru' ? 'Редактор уроков' : 'Lesson Editor'}
                    </Button>
                    <p className="text-muted-foreground text-sm">
                      {language === 'ru' 
                        ? 'Создавайте и редактируйте уроки для вашего сообщества' 
                        : 'Create and edit lessons for your community'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    {language === 'ru' ? 'Уроки скоро появятся...' : 'Courses coming soon...'}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="members">
                <div className="text-center py-16 text-muted-foreground">
                  Members list coming soon...
                </div>
              </TabsContent>

              <TabsContent value="about">
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h2 className="text-xl font-semibold mb-4">{community.name}</h2>
                  <p className="text-muted-foreground">{community.description || 'No description'}</p>
                </div>
              </TabsContent>
            </Tabs>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
