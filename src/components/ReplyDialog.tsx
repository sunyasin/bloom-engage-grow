import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { EmojiReactions } from "./EmojiReactions";

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
}

interface Reply {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    real_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReplyDialogProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export function ReplyDialog({ post, open, onClose, userId }: ReplyDialogProps) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (post && open) {
      fetchReplies();
    }
  }, [post, open]);

  const fetchReplies = async () => {
    if (!post) return;

    const { data: repliesData } = await supabase
      .from('post_replies')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (repliesData && repliesData.length > 0) {
      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      
      const { data: profiles } = await supabase
        .rpc('get_public_profiles', { profile_ids: userIds });

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      
      const repliesWithProfiles = repliesData.map(reply => ({
        ...reply,
        profiles: profileMap.get(reply.user_id) || null
      }));

      setReplies(repliesWithProfiles);
    } else {
      setReplies([]);
    }
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !userId || !post) return;

    setLoading(true);
    const { error } = await supabase
      .from('post_replies')
      .insert({ content: newReply.trim(), post_id: post.id, user_id: userId });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewReply("");
      fetchReplies();
      toast({
        title: "Success",
        description: "Reply posted successfully",
      });
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post & Replies</DialogTitle>
          <DialogDescription>View the post and add your reply</DialogDescription>
        </DialogHeader>
        
        {post && (
          <div className="space-y-4">
            {/* Original Post */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={post.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{post.profiles?.real_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{post.profiles?.real_name || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
                  </div>
                  <p className="text-foreground/80 whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>
            </div>

            {/* Reply Input */}
            {userId && (
              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Write your reply..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  onClick={handleSubmitReply} 
                  disabled={loading || !newReply.trim()}
                  className="bg-gradient-primary"
                >
                  {loading ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            )}

            {/* Replies List */}
            {replies.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </h4>
                {replies.map((reply) => (
                  <div key={reply.id} className="p-3 bg-background border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {reply.profiles?.real_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {reply.profiles?.real_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                          {reply.content}
                        </p>
                        <EmojiReactions replyId={reply.id} userId={userId} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
