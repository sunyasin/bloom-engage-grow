import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Pin, MessageSquare } from "lucide-react";
import { EmojiReactions } from "@/components/EmojiReactions";
import { ReplyDialog } from "@/components/ReplyDialog";

interface Post {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    real_name: string | null;
    avatar_url: string | null;
  } | null;
  reply_count?: number;
}

export default function Conversation() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superuser')
          .maybeSingle();
        setIsSuperuser(!!data);
      }
    };
    
    checkUser();
    fetchPosts();

    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-posts');
      
      if (error) {
        console.error('Error fetching posts:', error);
        toast({
          title: "Error",
          description: "Failed to load posts",
          variant: "destructive",
        });
        return;
      }

      if (data?.data) {
        // Fetch reply counts for all posts
        const postIds = data.data.map((p: Post) => p.id);
        const { data: replyCounts } = await supabase
          .from('post_replies')
          .select('post_id')
          .in('post_id', postIds);
        
        // Count replies per post
        const countMap: Record<string, number> = {};
        replyCounts?.forEach((r: { post_id: string }) => {
          countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
        });
        
        // Add reply counts to posts
        const postsWithCounts = data.data.map((post: Post) => ({
          ...post,
          reply_count: countMap[post.id] || 0
        }));
        
        setPosts(postsWithCounts);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;

    const { error } = await supabase
      .from('posts')
      .insert({ content: newPost, user_id: user.id });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewPost("");
      fetchPosts();
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    }
  };

  const handlePinPost = async (postId: string, currentPinStatus: boolean) => {
    if (!isSuperuser) return;

    const { error } = await supabase
      .from('posts')
      .update({ is_pinned: !currentPinStatus })
      .eq('id', postId);

    if (!error) {
      fetchPosts();
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-subtle rounded-lg p-6 shadow-medium">
          <h1 className="text-3xl font-bold mb-4">Conversation</h1>
          {user && (
            <div className="space-y-4">
              <Textarea
                placeholder="Share your thoughts..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[100px]"
              />
              <Button onClick={handleCreatePost} className="bg-gradient-primary">
                Post Message
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="p-4 hover:shadow-medium transition-smooth"
            >
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>{post.profiles?.real_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{post.profiles?.real_name || 'Anonymous'}</span>
                    {post.is_pinned && <Pin className="w-4 h-4 text-accent" />}
                    {isSuperuser && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinPost(post.id, post.is_pinned);
                        }}
                      >
                        {post.is_pinned ? 'Unpin' : 'Pin'}
                      </Button>
                    )}
                  </div>
                  <p className="text-foreground/80 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                    {post.reply_count && post.reply_count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </div>
                  <EmojiReactions postId={post.id} userId={user?.id || null} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <ReplyDialog
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        userId={user?.id || null}
      />
    </div>
  );
}
