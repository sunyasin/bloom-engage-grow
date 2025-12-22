import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

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
}

interface Reply {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: {
    real_name: string | null;
    avatar_url: string | null;
  };
}

interface CommunityReplyDialogProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  userId: string | null;
  language?: string;
}

export function CommunityReplyDialog({ post, open, onClose, userId, language = 'en' }: CommunityReplyDialogProps) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingReplies, setFetchingReplies] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (post && open) {
      fetchReplies();

      const channel = supabase
        .channel(`replies-${post.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'community_post_replies',
          filter: `post_id=eq.${post.id}`
        }, () => {
          fetchReplies();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [post, open]);

  const fetchReplies = async () => {
    if (!post) return;

    setFetchingReplies(true);
    const { data: repliesData } = await supabase
      .from('community_post_replies')
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
        user: profileMap.get(reply.user_id) || null
      }));

      setReplies(repliesWithProfiles);
    } else {
      setReplies([]);
    }
    setFetchingReplies(false);
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !userId || !post) return;

    setLoading(true);
    const { error } = await supabase
      .from('community_post_replies')
      .insert({ content: newReply.trim(), post_id: post.id, user_id: userId });

    if (error) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewReply("");
      fetchReplies();
      toast({
        title: language === 'ru' ? 'Успешно' : 'Success',
        description: language === 'ru' ? 'Ответ опубликован' : 'Reply posted successfully',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === 'ru' ? 'Сообщение и ответы' : 'Post & Replies'}</DialogTitle>
          <DialogDescription>
            {language === 'ru' ? 'Просмотрите сообщение и добавьте свой ответ' : 'View the post and add your reply'}
          </DialogDescription>
        </DialogHeader>

        {post && (
          <div className="space-y-4">
            {/* Original Post */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={post.user?.avatar_url || undefined} />
                  <AvatarFallback>{post.user?.real_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{post.user?.real_name || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: language === 'ru' ? ru : enUS
                      })}
                    </span>
                  </div>
                  <p className="text-foreground/80 whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>
            </div>

            {/* Replies List */}
            {fetchingReplies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  {replies.length} {replies.length === 1
                    ? (language === 'ru' ? 'ответ' : 'Reply')
                    : (language === 'ru' ? 'ответов' : 'Replies')}
                </h4>
                {replies.map((reply) => (
                  <div key={reply.id} className="p-3 bg-background border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.user?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {reply.user?.real_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {reply.user?.real_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), {
                              addSuffix: true,
                              locale: language === 'ru' ? ru : enUS
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-t">
                {language === 'ru' ? 'Пока нет ответов' : 'No replies yet'}
              </div>
            )}

            {/* Reply Input */}
            {userId && (
              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder={language === 'ru' ? 'Напишите ваш ответ...' : 'Write your reply...'}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleSubmitReply}
                  disabled={loading || !newReply.trim()}
                  className="bg-gradient-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {language === 'ru' ? 'Публикация...' : 'Posting...'}
                    </>
                  ) : (
                    language === 'ru' ? 'Отправить ответ' : 'Post Reply'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
