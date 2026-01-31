import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Smile,
  Loader2,
  MessageCircle,
  Pin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EMOJI_LIST = [
  "😀", "😊", "😂", "🥰", "😎", "🤔", "👍", "👎", 
  "❤️", "🔥", "🎉", "💪", "✨", "🙏", "👋", "💬"
];

interface ThreadMessage {
  id: string;
  sender_id: string;
  content_text: string;
  image_url: string | null;
  created_at: string;
  parent_message_id: string | null;
  is_pinned: boolean;
  sender?: {
    id: string;
    real_name: string | null;
    avatar_url: string | null;
  };
  replies: ThreadMessage[];
  reply_count: number;
}

interface CourseChatPanelProps {
  communityId: string;
  courseId: string | null; // null = show all courses
  courseName: string;
  userId: string;
  language: string;
  communityOwnerId?: string;
}

export function CourseChatPanel({ communityId, courseId, courseName, userId, language, communityOwnerId }: CourseChatPanelProps) {
  const [threads, setThreads] = useState<ThreadMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(communityOwnerId || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch community owner if not provided
  useEffect(() => {
    if (!communityOwnerId) {
      const fetchOwner = async () => {
        const { data } = await supabase
          .from('communities')
          .select('creator_id')
          .eq('id', communityId)
          .single();
        if (data) setOwnerId(data.creator_id);
      };
      fetchOwner();
    }
  }, [communityId, communityOwnerId]);

  const isOwner = userId === ownerId;

  // Fetch all messages for this course (or all courses if courseId is null)
  const fetchThreads = useCallback(async () => {
    let query = supabase
      .from('direct_messages')
      .select('*')
      .eq('community_id', communityId)
      .not('course_id', 'is', null); // Only course messages
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data: messagesData } = await query.order('created_at', { ascending: true });

    if (!messagesData || messagesData.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    // Get unique sender IDs
    const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
    
    const { data: profiles } = await supabase.rpc('get_public_profiles', { 
      profile_ids: senderIds 
    });

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    // Build thread structure - separate root messages and replies
    const rootMessages: ThreadMessage[] = [];
    const repliesMap = new Map<string, ThreadMessage[]>();

    messagesData.forEach((msg: any) => {
      const enrichedMsg: ThreadMessage = {
        id: msg.id,
        sender_id: msg.sender_id,
        content_text: msg.content_text,
        image_url: msg.image_url,
        created_at: msg.created_at,
        parent_message_id: msg.parent_message_id,
        is_pinned: msg.is_pinned || false,
        sender: profileMap.get(msg.sender_id) as any,
        replies: [],
        reply_count: 0
      };

      if (msg.parent_message_id) {
        // It's a reply
        if (!repliesMap.has(msg.parent_message_id)) {
          repliesMap.set(msg.parent_message_id, []);
        }
        repliesMap.get(msg.parent_message_id)!.push(enrichedMsg);
      } else {
        // It's a root message
        rootMessages.push(enrichedMsg);
      }
    });

    // Attach replies to root messages
    rootMessages.forEach(root => {
      root.replies = repliesMap.get(root.id) || [];
      root.reply_count = root.replies.length;
    });

    // Sort: pinned first, then by date descending
    rootMessages.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setThreads(rootMessages);
    setLoading(false);
  }, [communityId, courseId]);

  useEffect(() => {
    fetchThreads();

    // Realtime subscription - listen to all course messages for this community
    const channelName = courseId ? `course-chat-${courseId}` : `course-chat-all-${communityId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `community_id=eq.${communityId}`
        },
        (payload: any) => {
          // Only refetch if it's a course message
          if (payload.new?.course_id || payload.old?.course_id) {
            fetchThreads();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, communityId, fetchThreads]);

  const uploadImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'ru' ? 'Файл слишком большой (макс. 10MB)' : 'File too large (max 10MB)');
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${communityId}/course-chat/${courseId}/${userId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('community-content')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('community-content')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(language === 'ru' ? 'Ошибка загрузки' : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        if (isReply && replyingTo) {
          await sendReply(null, url);
        } else {
          await sendMessage(null, url);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const sendMessage = async (text: string | null, imageUrl: string | null = null) => {
    if (!text?.trim() && !imageUrl) return;
    
    // Cannot send message without a specific course selected
    if (!courseId) {
      toast.error(language === 'ru' ? 'Выберите курс для отправки сообщения' : 'Select a course to send a message');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: userId,
          community_id: communityId,
          course_id: courseId,
          content_text: text?.trim() || '',
          image_url: imageUrl,
          parent_message_id: null,
          is_pinned: false
        });

      if (error) throw error;

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (text: string | null, imageUrl: string | null = null) => {
    if (!replyingTo || (!text?.trim() && !imageUrl)) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: userId,
          community_id: communityId,
          course_id: courseId,
          content_text: text?.trim() || '',
          image_url: imageUrl,
          parent_message_id: replyingTo,
          is_pinned: false
        });

      if (error) throw error;

      setReplyText('');
      setReplyingTo(null);
      setShowReplyEmojiPicker(false);
      // Expand thread to show new reply
      setExpandedThreads(prev => new Set([...prev, replyingTo]));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handlePin = async (messageId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_pinned: !currentlyPinned })
      .eq('id', messageId);

    if (error) {
      toast.error(error.message);
    } else {
      fetchThreads();
    }
  };

  const handleSend = () => {
    sendMessage(newMessage);
  };

  const handleSendReply = () => {
    sendReply(replyText);
  };

  const handleKeyDown = (e: React.KeyboardEvent, isReply: boolean = false) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isReply) {
        handleSendReply();
      } else {
        handleSend();
      }
    }
  };

  const addEmoji = (emoji: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyText(prev => prev + emoji);
      setShowReplyEmojiPicker(false);
      replyTextareaRef.current?.focus();
    } else {
      setNewMessage(prev => prev + emoji);
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    }
  };

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  // Handle paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const url = await uploadImage(file);
            if (url) {
              if (replyingTo) {
                await sendReply(null, url);
              } else {
                await sendMessage(null, url);
              }
            }
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [replyingTo]);

  const renderMessage = (msg: ThreadMessage, isReply: boolean = false) => (
    <div className={cn("flex gap-3", isReply && "pl-8 mt-3")}>
      <Avatar className={cn("shrink-0", isReply ? "h-8 w-8" : "h-10 w-10")}>
        <AvatarImage src={msg.sender?.avatar_url || ''} />
        <AvatarFallback>
          {msg.sender?.real_name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-medium", isReply ? "text-xs" : "text-sm")}>
            {msg.sender?.real_name || 'Anonymous'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(msg.created_at), {
              addSuffix: true,
              locale: language === 'ru' ? ru : enUS
            })}
          </span>
        </div>
        
        {msg.image_url && (
          <img 
            src={msg.image_url} 
            alt="" 
            className="rounded-lg max-w-[300px] mb-2 cursor-pointer"
            onClick={() => window.open(msg.image_url!, '_blank')}
          />
        )}
        
        {msg.content_text && (
          <p className={cn("whitespace-pre-wrap", isReply ? "text-sm" : "text-sm")}>{msg.content_text}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {courseId 
            ? (language === 'ru' ? `Обсуждение: ${courseName}` : `Discussion: ${courseName}`)
            : (language === 'ru' ? 'Обсуждения курсов' : 'Course Discussions')
          }
        </h3>
      </div>

      {/* New message form at top - only when course is selected */}
      {courseId && (
        <div className="p-4 border-b border-border">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, false)}
                placeholder={language === 'ru' ? 'Написать сообщение...' : 'Write a message...'}
                className="min-h-[60px] resize-none pr-20"
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, false)}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg z-10">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji, false)}
                        className="text-lg hover:bg-muted rounded p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sending}
              className="bg-gradient-primary"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Hint when no course selected */}
      {!courseId && (
        <div className="p-3 border-b border-border bg-muted/50 text-sm text-muted-foreground">
          {language === 'ru' 
            ? 'Выберите курс выше, чтобы написать сообщение' 
            : 'Select a course above to write a message'}
        </div>
      )}

      {/* Messages list */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {language === 'ru' ? 'Нет сообщений. Начните обсуждение!' : 'No messages. Start the discussion!'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map(thread => (
              <div key={thread.id} className="p-4">
                {/* Pinned indicator */}
                {thread.is_pinned && (
                  <div className="flex items-center gap-1 text-xs text-primary mb-2">
                    <Pin className="h-3 w-3" />
                    <span>{language === 'ru' ? 'Закреплено' : 'Pinned'}</span>
                  </div>
                )}
                
                {/* Main message */}
                {renderMessage(thread)}

                {/* Action buttons */}
                <div className="mt-2 pl-13 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (replyingTo === thread.id) {
                        setReplyingTo(null);
                      } else {
                        setReplyingTo(thread.id);
                        setReplyText('');
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {language === 'ru' ? 'Ответить' : 'Reply'}
                  </button>
                  
                  {thread.reply_count > 0 && (
                    <button
                      onClick={() => toggleThread(thread.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {expandedThreads.has(thread.id) 
                        ? (language === 'ru' ? 'Скрыть ответы' : 'Hide replies')
                        : (language === 'ru' ? `Показать ответы (${thread.reply_count})` : `Show replies (${thread.reply_count})`)
                      }
                    </button>
                  )}

                  {/* Pin button - only for owner */}
                  {isOwner && (
                    <button
                      onClick={() => handlePin(thread.id, thread.is_pinned)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {thread.is_pinned 
                        ? (language === 'ru' ? 'Открепить' : 'Unpin')
                        : (language === 'ru' ? 'Закрепить' : 'Pin')
                      }
                    </button>
                  )}
                </div>

                {/* Reply form */}
                {replyingTo === thread.id && (
                  <div className="mt-3 pl-8">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea
                          ref={replyTextareaRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, true)}
                          placeholder={language === 'ru' ? 'Ваш ответ...' : 'Your reply...'}
                          className="min-h-[50px] resize-none pr-16 text-sm"
                          autoFocus
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
                          >
                            <Smile className="h-3.5 w-3.5" />
                          </Button>
                          <input
                            ref={replyFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, true)}
                            className="hidden"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => replyFileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {showReplyEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg z-10">
                            <div className="grid grid-cols-8 gap-1">
                              {EMOJI_LIST.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addEmoji(emoji, true)}
                                  className="text-lg hover:bg-muted rounded p-1"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={handleSendReply} 
                        disabled={!replyText.trim() || sending}
                        className="bg-gradient-primary"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {expandedThreads.has(thread.id) && thread.replies.length > 0 && (
                  <div className="mt-3 space-y-3 border-l-2 border-border ml-5">
                    {thread.replies.map(reply => (
                      <div key={reply.id}>
                        {renderMessage(reply, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
