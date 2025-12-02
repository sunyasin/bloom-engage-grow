import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EMOJI_LIST = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉", 
  "🔥", "👏", "💯", "🙌", "✨", "💪", "🤔", "👀",
  "💡", "⭐", "🚀", "💬"
];

interface EmojiReactionsProps {
  postId?: string;
  replyId?: string;
  userId: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  post_id: string;
}

export function EmojiReactions({ postId, replyId, userId }: EmojiReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchReactions();
  }, [postId, replyId]);

  const fetchReactions = async () => {
    let query = supabase.from('post_reactions').select('*');
    
    if (postId) {
      query = query.eq('post_id', postId).is('reply_id', null);
    } else if (replyId) {
      query = query.eq('reply_id', replyId);
    }
    
    const { data } = await query;

    if (data) {
      setReactions(data);
      const myReaction = data.find(r => r.user_id === userId);
      setUserReaction(myReaction?.emoji || null);
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    if (!userId) return;

    // If clicking the same emoji, remove it
    if (userReaction === emoji) {
      let deleteQuery = supabase.from('post_reactions').delete().eq('user_id', userId);
      
      if (postId) {
        deleteQuery = deleteQuery.eq('post_id', postId).is('reply_id', null);
      } else if (replyId) {
        deleteQuery = deleteQuery.eq('reply_id', replyId);
      }

      const { error } = await deleteQuery;

      if (!error) {
        setUserReaction(null);
        fetchReactions();
      }
    } else {
      // If user has a different reaction, remove it first
      if (userReaction) {
        let deleteQuery = supabase.from('post_reactions').delete().eq('user_id', userId);
        
        if (postId) {
          deleteQuery = deleteQuery.eq('post_id', postId).is('reply_id', null);
        } else if (replyId) {
          deleteQuery = deleteQuery.eq('reply_id', replyId);
        }
        
        await deleteQuery;
      }

      // Add new reaction
      const insertData: any = { emoji, user_id: userId };
      if (postId) insertData.post_id = postId;
      if (replyId) insertData.reply_id = replyId;
      
      const { error } = await supabase
        .from('post_reactions')
        .insert(insertData);

      if (!error) {
        setUserReaction(emoji);
        fetchReactions();
      }
    }
  };

  // Count reactions per emoji
  const reactionCounts = EMOJI_LIST.reduce((acc, emoji) => {
    acc[emoji] = reactions.filter(r => r.emoji === emoji).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div 
      className="flex flex-wrap gap-1 mt-3 pt-3 border-t"
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_LIST.map((emoji) => {
        const count = reactionCounts[emoji];
        const isSelected = userReaction === emoji;
        
        return (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            disabled={!userId}
            className={cn(
              "px-2 py-1 rounded-full text-sm transition-all",
              "hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected && "bg-primary/20 ring-2 ring-primary",
              count > 0 && !isSelected && "bg-muted"
            )}
          >
            {emoji}
            {count > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
