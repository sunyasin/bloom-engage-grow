import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, Pin, MessageSquare, Send, Loader2, Settings, SlidersHorizontal, Lock, BookOpen } from "lucide-react";
import { SubscriptionTiersManager } from "@/components/SubscriptionTiersManager";
import { CommunitySettingsDialog } from "@/components/CommunitySettingsDialog";
import { User } from "@supabase/supabase-js";
import { CoursesTab } from "@/components/CoursesTab";
import { CommunityReplyDialog } from "@/components/CommunityReplyDialog";
import { PostLikeButton } from "@/components/PostLikeButton";
import { CommunityEventsTab } from "@/components/CommunityEventsTab";
import { PrivateChatPanel } from "@/components/PrivateChatPanel";
import { usePrivateChatAccess } from "@/hooks/usePrivateChatAccess";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useCommunityTabs } from "@/contexts/CommunityTabsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  creator_id: string;
  content_html?: string | null;
}

interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  creator_id: string;
  content_html?: string | null;
}

interface Post {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  course_id?: string | null;
  user?: {
    real_name: string | null;
    avatar_url: string | null;
  };
  reply_count?: number;
}

interface AccessibleCourse {
  id: string;
  title: string;
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
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [subscriptionSettingsOpen, setSubscriptionSettingsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const [accessibleCourses, setAccessibleCourses] = useState<AccessibleCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { hasPrivateChatAccess, loading: privateChatLoading } = usePrivateChatAccess(id || null, user?.id || null);

  const [searchParams] = useSearchParams();

  // Set up community tabs in header
  useEffect(() => {
    if (id) {
      setCommunityId(id);
      setTabs([
        { value: "feed", label: language === "ru" ? "Лента" : "Feed" },
        { value: "courses", label: language === "ru" ? "Курсы" : "Courses" },
        { value: "events", label: language === "ru" ? "События" : "Events" },
        { value: "about", label: language === "ru" ? "О сообществе" : "About" },
      ]);
      const tabParam = searchParams.get("tab");
      setActiveTab(
        tabParam && ["feed", "courses", "events", "about"].includes(tabParam) ? tabParam : "feed",
      );
    }

    return () => {
      setCommunityId(null);
      setTabs([]);
    };
  }, [id, language, setCommunityId, setTabs, setActiveTab, searchParams]);

  const fetchCommunity = async () => {
    if (!id) return;

    const { data, error } = await supabase.from("communities").select("*").eq("id", id).single();

    if (!error && data) {
      setCommunity(data);
    }
    setLoading(false);
  };

  const fetchPosts = async (courseFilter?: string | null) => {
    if (!id) return;

    let query = supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", id);
    
    // Apply course filter
    if (courseFilter) {
      query = query.eq("course_id", courseFilter);
    } else {
      // When no course filter, show only posts without course_id (general feed)
      query = query.is("course_id", null);
    }
    
    const { data: postsData, error } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && postsData) {
      // Fetch user profiles
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", { profile_ids: userIds });

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      // Fetch reply counts
      const { data: replyCounts } = await supabase
        .from("community_post_replies")
        .select("post_id")
        .in(
          "post_id",
          postsData.map((p) => p.id),
        );

      const countMap: Record<string, number> = {};
      replyCounts?.forEach((r: { post_id: string }) => {
        countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
      });

      const postsWithUsers = postsData.map((post) => ({
        ...post,
        user: profileMap.get(post.user_id) as any,
        reply_count: countMap[post.id] || 0,
      }));

      setPosts(postsWithUsers);
    }
  };

  const checkMembership = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from("community_members")
      .select("id, role")
      .eq("community_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsMember(!!data);
    setUserRole(data?.role || null);
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("rating, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
    }
  };

  // Fetch courses that user has access to
  const fetchAccessibleCourses = async () => {
    if (!id) return;

    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, title, author_id, status, access_types, access_type, required_rating, delay_days, gifted_emails, promo_code")
      .eq("community_id", id)
      .eq("status", "published");

    if (!coursesData) return;

    // For owner, all courses are accessible
    if (community?.creator_id === user?.id) {
      setAccessibleCourses(coursesData.map(c => ({ id: c.id, title: c.title })));
      return;
    }

    // Check access for each course
    const accessible: AccessibleCourse[] = [];

    for (const course of coursesData) {
      const accessTypes = course.access_types?.length > 0 ? course.access_types : [course.access_type || 'open'];
      
      // Check if any access type is satisfied
      let hasAccess = false;
      
      for (const accessType of accessTypes) {
        if (accessType === 'open') {
          hasAccess = true;
          break;
        }
        
        if (accessType === 'paid_subscription' && hasPrivateChatAccess) {
          hasAccess = true;
          break;
        }
        
        if (accessType === 'by_rating_level' && userProfile?.rating != null && course.required_rating != null) {
          if (userProfile.rating >= course.required_rating) {
            hasAccess = true;
            break;
          }
        }
      }
      
      if (hasAccess) {
        accessible.push({ id: course.id, title: course.title });
      }
    }

    setAccessibleCourses(accessible);
  };

  useEffect(() => {
    fetchCommunity();
    fetchPosts(selectedCourseId);
    checkMembership();
    fetchUserProfile();

    // Realtime subscription
    const channel = supabase
      .channel("community-posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts", filter: `community_id=eq.${id}` },
        () => {
          fetchPosts(selectedCourseId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, selectedCourseId]);

  // Fetch accessible courses when user profile and membership are loaded
  useEffect(() => {
    if (community && !privateChatLoading) {
      fetchAccessibleCourses();
    }
  }, [community, userProfile, hasPrivateChatAccess, privateChatLoading]);

  const handleJoin = async () => {
    if (!user || !id) return;

    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user.id });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setIsMember(true);
      setCommunity((prev) => (prev ? { ...prev, member_count: prev.member_count + 1 } : null));
      toast({ title: "Success", description: "You joined the community!" });
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;

    const { error } = await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setIsMember(false);
      setCommunity((prev) => (prev ? { ...prev, member_count: prev.member_count - 1 } : null));
    }
  };

  const handlePost = async () => {
    if (!user || !id || !newPost.trim()) return;

    setPosting(true);
    const { error } = await supabase
      .from("community_posts")
      .insert({ 
        community_id: id, 
        user_id: user.id, 
        content: newPost.trim(),
        course_id: selectedCourseId || null
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPost("");
    }
    setPosting(false);
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    const { error } = await supabase.from("community_posts").update({ is_pinned: !isPinned }).eq("id", postId);

    if (!error) {
      fetchPosts(selectedCourseId);
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
    fetchPosts(selectedCourseId);
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

  const handleCommunityUpdate = (updated: {
    name: string;
    description: string | null;
    cover_image_url: string | null;
    content_html: string | null;
  }) => {
    setCommunity((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Compact community header */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Logo */}
          {community.cover_image_url && (
            <img
              src={community.cover_image_url}
              alt={community.name}
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
          )}
          {/* Name */}
          <h1 className="text-xl font-semibold text-foreground">{community.name}</h1>
          {/* Member count */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{community.member_count.toLocaleString()}</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user && !isMember && (
              <Button onClick={handleJoin} size="sm" className="bg-gradient-primary">
                {t("community.join")}
              </Button>
            )}
            {user && isMember && !isOwner && (
              <Button onClick={handleLeave} size="sm" variant="outline">
                {t("community.leave")}
              </Button>
            )}
            {isOwner && (
              <>
                <Button onClick={() => setSettingsOpen(true)} size="sm" variant="outline">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <Button onClick={() => setSubscriptionSettingsOpen(true)} size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-3xl">
          {/* Feed Tab */}
          {activeTab === "feed" && (
            <>
              {/* Chat Toggle Buttons */}
              {isMember && user && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <TooltipProvider>
                    {/* Private Chat Button */}
                    {hasPrivateChatAccess || isOwner ? (
                      <Button
                        variant={showPrivateChat && !selectedCourseId ? "default" : "outline"}
                        onClick={() => {
                          setShowPrivateChat(!showPrivateChat || selectedCourseId !== null);
                          setSelectedCourseId(null);
                        }}
                        className={showPrivateChat && !selectedCourseId ? "bg-gradient-primary" : ""}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {language === "ru" ? "Приватный чат" : "Private Chat"}
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" disabled className="opacity-50">
                            <Lock className="h-4 w-4 mr-2" />
                            {language === "ru" ? "Приватный чат" : "Private Chat"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{language === "ru" ? "Доступно на платной подписке" : "Available on paid subscription"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Course Filter Buttons */}
                    {accessibleCourses.length > 0 && (
                      <>
                        {accessibleCourses.map(course => (
                          <Button
                            key={course.id}
                            variant={selectedCourseId === course.id && !showPrivateChat ? "default" : "outline"}
                            onClick={() => {
                              if (selectedCourseId === course.id && !showPrivateChat) {
                                // Toggle off - show general feed
                                setSelectedCourseId(null);
                              } else {
                                setSelectedCourseId(course.id);
                                setShowPrivateChat(false); // Close private chat and show course feed
                              }
                            }}
                            className={selectedCourseId === course.id && !showPrivateChat ? "bg-gradient-primary" : ""}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            {course.title}
                          </Button>
                        ))}
                      </>
                    )}
                  </TooltipProvider>
                </div>
              )}

              {/* Private Chat Panel */}
              {showPrivateChat && (hasPrivateChatAccess || isOwner) && user && (
                <div className="mb-6">
                  <PrivateChatPanel
                    communityId={id!}
                    userId={user.id}
                    language={language}
                  />
                </div>
              )}

              {/* New post form */}
              {isMember && !showPrivateChat && (
                <div className="bg-card rounded-xl p-4 border border-border mb-6">
                  {selectedCourseId && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {language === "ru" ? "Публикация в курс: " : "Posting to course: "}
                        <strong>{accessibleCourses.find(c => c.id === selectedCourseId)?.title}</strong>
                      </span>
                    </div>
                  )}
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={t("community.writeSomething")}
                    className="min-h-[100px] resize-none mb-3"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handlePost} disabled={!newPost.trim() || posting} className="bg-gradient-primary">
                      {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      {t("community.post")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Posts */}
              {!showPrivateChat && (
                <div className="space-y-4">
                  {posts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {selectedCourseId 
                        ? (language === "ru" ? "Нет постов для этого курса" : "No posts for this course")
                        : (language === "ru" ? "Нет постов" : "No posts")
                      }
                    </div>
                  )}
                  {posts.map((post) => (
                    <div key={post.id} className="bg-card rounded-xl p-4 border border-border">
                      {post.is_pinned && (
                        <div className="flex items-center gap-1 text-xs text-primary mb-2">
                          <Pin className="h-3 w-3" />
                          <span>{t("community.pinned")}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.user?.avatar_url || ""} />
                          <AvatarFallback>{post.user?.real_name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{post.user?.real_name || "Anonymous"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: language === "ru" ? ru : enUS,
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
                              isMember={isMember || isOwner}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => isMember || isOwner ? handleOpenReplyDialog(post) : null}
                                    disabled={!isMember && !isOwner}
                                    className={`flex items-center gap-1 text-sm transition-smooth ${
                                      !isMember && !isOwner 
                                        ? 'text-muted-foreground/50 cursor-not-allowed' 
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{t("community.reply")}</span>
                                    {post.reply_count && post.reply_count > 0 && (
                                      <span className="ml-1">({post.reply_count})</span>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                {!isMember && !isOwner && (
                                  <TooltipContent>
                                    <p>{language === "ru" ? "Для отправки сообщений вступите в сообщество" : "Join the community to send messages"}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                            {isOwner && (
                              <button
                                onClick={() => handlePin(post.id, post.is_pinned)}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                              >
                                <Pin className="h-4 w-4" />
                                <span>{post.is_pinned ? t("community.unpin") : t("community.pin")}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <CoursesTab communityId={id!} isOwner={isOwner} userId={user?.id} language={language} navigate={navigate} />
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <CommunityEventsTab
              communityId={id!}
              userId={user?.id || null}
              isOwnerOrModerator={userRole === "owner" || userRole === "moderator"}
              userRating={userProfile?.rating || 0}
              userTier={userProfile?.subscription_tier || null}
            />
          )}


          {/* About Tab */}
          {activeTab === "about" && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Description - always shown if exists */}
              {community.description && (
                <div className="px-6 pt-6 pb-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">{community.description}</p>
                </div>
              )}

              {/* Rich content - shown below description */}
              {community.content_html && (
                <div className="px-6 pb-6">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: community.content_html }}
                  />
                </div>
              )}
            </div>
          )}
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
        isMember={isMember || isOwner}
      />
    </div>
  );
}
