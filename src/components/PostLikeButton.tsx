import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PostLikeButtonProps {
  postId: string;
  userId: string | null;
  postAuthorId: string;
  language?: string;
  isMember?: boolean;
}

export function PostLikeButton({ postId, userId, postAuthorId, language = 'en', isMember = true }: PostLikeButtonProps) {
  const isOwnPost = userId === postAuthorId;
  const isDisabled = isOwnPost || !isMember;
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLikes();

    const channel = supabase
      .channel(`post-likes-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_post_likes',
        filter: `post_id=eq.${postId}`
      }, () => {
        fetchLikes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, userId]);

  const fetchLikes = async () => {
    const { data: likes } = await supabase
      .from('community_post_likes')
      .select('id, user_id')
      .eq('post_id', postId);

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

    if (!isMember) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Для отправки сообщений вступите в сообщество' : 'Join the community to interact',
        variant: 'destructive',
      });
      return;
    }

    if (isOwnPost) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Нельзя лайкать свои сообщения' : 'You cannot like your own posts',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const wasLiked = isLiked;

    setIsLiked(!isLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

    if (wasLiked) {
      const { error } = await supabase
        .from('community_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        setIsLiked(wasLiked);
        setLikeCount(prev => prev + 1);
        toast({
          title: language === 'ru' ? 'Ошибка' : 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        // Decrease author's rating
        await supabase.rpc('decrement_rating', { user_id_param: postAuthorId });
      }
    } else {
      const { error } = await supabase
        .from('community_post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) {
        setIsLiked(wasLiked);
        setLikeCount(prev => prev - 1);
        toast({
          title: language === 'ru' ? 'Ошибка' : 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        // Increase author's rating
        await supabase.rpc('increment_rating', { user_id_param: postAuthorId });
      }
    }

    setLoading(false);
  };

  const getTitle = () => {
    if (!isMember) {
      return language === 'ru' ? 'Для отправки сообщений вступите в сообщество' : 'Join the community to interact';
    }
    if (isOwnPost) {
      return language === 'ru' ? 'Нельзя лайкать свои сообщения' : 'You cannot like your own posts';
    }
    return undefined;
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={loading || isDisabled}
      className={`flex items-center gap-1 text-sm transition-smooth ${
        isDisabled
          ? 'text-muted-foreground/50 cursor-not-allowed'
          : isLiked
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground hover:text-foreground'
      }`}
      title={getTitle()}
    >
      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
      <span>{language === 'ru' ? 'Нравится' : 'Like'}</span>
      {likeCount > 0 && <span className="ml-1">({likeCount})</span>}
    </button>
  );
}
