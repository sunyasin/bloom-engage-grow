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
  ChevronDown,
  ChevronRight
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
  sender?: {
    id: string;
    real_name: string | null;
    avatar_url: string | null;
  };
  replies?: ThreadMessage[];
}

interface CourseChatPanelProps {
  communityId: string;
  courseId: string;
  courseName: string;
  userId: string;
  language: string;
}

export function CourseChatPanel({ communityId, courseId, courseName, userId, language }: CourseChatPanelProps) {
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all messages for this course
  const fetchThreads = useCallback(async () => {
    const { data: messagesData } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('community_id', communityId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

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

    // Build thread structure
    // Parent messages have recipient_id = sender_id (self-addressed) or null
    // Replies have recipient_id = parent message sender
    const parentMessages: ThreadMessage[] = [];
    const repliesMap = new Map<string, ThreadMessage[]>();

    messagesData.forEach((msg: any) => {
      const enrichedMsg: ThreadMessage = {
        ...msg,
        sender: profileMap.get(msg.sender_id) as any,
        replies: []
      };

      // Check if this is a reply (has parent_message_id in metadata or recipient != sender)
      // We'll use a convention: if sender_id === recipient_id, it's a root message
      // Otherwise, it could be a reply
      // Actually, let's use a simpler approach: root messages are those where sender_id === recipient_id
      if (msg.sender_id === msg.recipient_id || !msg.recipient_id) {
        parentMessages.push(enrichedMsg);
      } else {
        // It's a reply - find parent by looking at earlier messages from recipient
        // For simplicity, we'll treat all as root messages but group replies by parent
        // Let's use a metadata field or create proper threading
        // For now, show all as root messages since we don't have parent_message_id
        parentMessages.push(enrichedMsg);
      }
    });

    // Sort by date descending (newest first)
    parentMessages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setThreads(parentMessages);
    setLoading(false);
  }, [communityId, courseId]);

  useEffect(() => {
    fetchThreads();

    // Realtime subscription
    const channel = supabase
      .channel(`course-chat-${courseId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, fetchThreads]);

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

    setSending(true);
    try {
      // For course chat, we set sender_id = recipient_id to mark it as a root post
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: userId, // Self-addressed = root message
          community_id: communityId,
          course_id: courseId,
          content_text: text?.trim() || '',
          image_url: imageUrl
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

    const parentMsg = threads.find(t => t.id === replyingTo);
    if (!parentMsg) return;

    setSending(true);
    try {
      // For replies, set recipient_id to the parent message sender
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: parentMsg.sender_id, // Reply to original poster
          community_id: communityId,
          course_id: courseId,
          content_text: text?.trim() || '',
          image_url: imageUrl
        });

      if (error) throw error;

      setReplyText('');
      setReplyingTo(null);
      setShowReplyEmojiPicker(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {language === 'ru' ? `Обсуждение: ${courseName}` : `Discussion: ${courseName}`}
        </h3>
      </div>

      {/* New message form at top */}
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
                {/* Main message */}
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={thread.sender?.avatar_url || ''} />
                    <AvatarFallback>
                      {thread.sender?.real_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {thread.sender?.real_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(thread.created_at), {
                          addSuffix: true,
                          locale: language === 'ru' ? ru : enUS
                        })}
                      </span>
                    </div>
                    
                    {thread.image_url && (
                      <img 
                        src={thread.image_url} 
                        alt="" 
                        className="rounded-lg max-w-[300px] mb-2 cursor-pointer"
                        onClick={() => window.open(thread.image_url!, '_blank')}
                      />
                    )}
                    
                    {thread.content_text && (
                      <p className="text-sm whitespace-pre-wrap">{thread.content_text}</p>
                    )}

                    {/* Reply button */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {language === 'ru' ? 'Ответить' : 'Reply'}
                      </button>
                    </div>

                    {/* Reply form */}
                    {replyingTo === thread.id && (
                      <div className="mt-3 pl-4 border-l-2 border-border">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
