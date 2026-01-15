import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReplyLikeButtonProps {
  replyId: string;
  userId: string | null;
  replyAuthorId: string;
  language?: string;
}

export function ReplyLikeButton({ replyId, userId, replyAuthorId, language = 'en' }: ReplyLikeButtonProps) {
  const isOwnReply = userId === replyAuthorId;
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLikes();

    const channel = supabase
      .channel(`reply-likes-${replyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_reply_likes',
        filter: `reply_id=eq.${replyId}`
      }, () => {
        fetchLikes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [replyId, userId]);

  const fetchLikes = async () => {
    const { data: likes } = await supabase
      .from('community_reply_likes')
      .select('id, user_id')
      .eq('reply_id', replyId);

    if (likes) {
      setLikeCount(likes.length);
      if (userId) {
        setIsLiked(likes.some(like => like.user_id === userId));
      }
    }
  };

  const handleToggleLike = async () => {
    if (!userId) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Необходимо войти в систему' : 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }

    if (isOwnReply) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Нельзя лайкать свои сообщения' : 'You cannot like your own replies',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    if (isLiked) {
      const { error } = await supabase
        .from('community_reply_likes')
        .delete()
        .eq('reply_id', replyId)
        .eq('user_id', userId);

      if (error) {
        toast({
          title: language === 'ru' ? 'Ошибка' : 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      const { error } = await supabase
        .from('community_reply_likes')
        .insert({ reply_id: replyId, user_id: userId });

      if (error) {
        toast({
          title: language === 'ru' ? 'Ошибка' : 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleLike}
      disabled={loading || isOwnReply}
      className={`h-7 gap-1 ${
        isOwnReply
          ? 'text-muted-foreground/50 cursor-not-allowed'
          : isLiked
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground'
      }`}
      title={isOwnReply ? (language === 'ru' ? 'Нельзя лайкать свои сообщения' : 'You cannot like your own replies') : undefined}
    >
      <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
      {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
    </Button>
  );
}
