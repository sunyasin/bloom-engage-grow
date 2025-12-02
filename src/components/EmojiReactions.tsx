import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EMOJI_LIST = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉", 
  "🔥", "👏", "💯", "🙌", "✨", "💪", "🤔", "👀",
  "💡", "⭐", "🚀", "💬"
];

interface EmojiReactionsProps {
  postId: string;
  userId: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  post_id: string;
}

export function EmojiReactions({ postId, userId }: EmojiReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchReactions();
  }, [postId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('post_id', postId);

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
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (!error) {
        setUserReaction(null);
        fetchReactions();
      }
    } else {
      // If user has a different reaction, remove it first
      if (userReaction) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      }

      // Add new reaction
      const { error } = await supabase
        .from('post_reactions')
        .insert({ emoji, post_id: postId, user_id: userId });

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
