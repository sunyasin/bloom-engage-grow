import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  ChevronDown, 
  ChevronRight,
  Search,
  Smile,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EMOJI_LIST = [
  "😀", "😊", "😂", "🥰", "😎", "🤔", "👍", "👎", 
  "❤️", "🔥", "🎉", "💪", "✨", "🙏", "👋", "💬"
];

interface Member {
  id: string;
  user_id: string;
  role: string;
  user?: {
    id: string;
    real_name: string | null;
    avatar_url: string | null;
  };
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content_text: string;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  partnerId: string;
  partner: {
    id: string;
    real_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: Message;
  unreadCount: number;
}

interface PrivateChatPanelProps {
  communityId: string;
  userId: string;
  language: string;
}

export function PrivateChatPanel({ communityId, userId, language }: PrivateChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [communityOwnerId, setCommunityOwnerId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch community owner
  useEffect(() => {
    const fetchOwner = async () => {
      const { data } = await supabase
        .from('communities')
        .select('creator_id')
        .eq('id', communityId)
        .single();
      
      if (data) {
        setCommunityOwnerId(data.creator_id);
      }
    };
    fetchOwner();
  }, [communityId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const { data: messagesData } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('community_id', communityId)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!messagesData) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, { messages: Message[]; partnerId: string }>();
    
    messagesData.forEach((msg: Message) => {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { messages: [], partnerId });
      }
      convMap.get(partnerId)!.messages.push(msg);
    });

    // Fetch partner profiles
    const partnerIds = Array.from(convMap.keys());
    if (partnerIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase.rpc('get_public_profiles', { 
      profile_ids: partnerIds 
    });

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    const convs: Conversation[] = Array.from(convMap.values()).map(conv => {
      const unreadCount = conv.messages.filter(
        m => m.recipient_id === userId && !m.read_at
      ).length;
      
      return {
        partnerId: conv.partnerId,
        partner: profileMap.get(conv.partnerId) as any || { 
          id: conv.partnerId, 
          real_name: null, 
          avatar_url: null 
        },
        lastMessage: conv.messages[0],
        unreadCount
      };
    });

    // Sort by last message date
    convs.sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );

    setConversations(convs);
    setLoading(false);
  }, [communityId, userId]);

  // Fetch community members
  const fetchMembers = useCallback(async () => {
    const { data: membersData } = await supabase
      .from('community_members')
      .select('id, user_id, role')
      .eq('community_id', communityId);

    if (!membersData) return;

    const userIds = membersData.map(m => m.user_id).filter(id => id !== userId);
    
    if (userIds.length === 0) {
      setMembers([]);
      return;
    }

    const { data: profiles } = await supabase.rpc('get_public_profiles', { 
      profile_ids: userIds 
    });

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    const membersWithProfiles = membersData
      .filter(m => m.user_id !== userId)
      .map(m => ({
        ...m,
        user: profileMap.get(m.user_id) as any
      }));

    // Sort: owner first, then by name
    membersWithProfiles.sort((a, b) => {
      if (a.user_id === communityOwnerId) return -1;
      if (b.user_id === communityOwnerId) return 1;
      const nameA = a.user?.real_name || '';
      const nameB = b.user?.real_name || '';
      return nameA.localeCompare(nameB);
    });

    setMembers(membersWithProfiles);
  }, [communityId, userId, communityOwnerId]);

  useEffect(() => {
    fetchConversations();
    fetchMembers();

    // Realtime subscription for new messages
    const channel = supabase
      .channel('private-messages')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `community_id=eq.${communityId}`
        },
        () => {
          fetchConversations();
          if (selectedConversation) {
            fetchMessagesForConversation(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, fetchConversations, fetchMembers, selectedConversation]);

  // Fetch messages for selected conversation
  const fetchMessagesForConversation = async (partnerId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('community_id', communityId)
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      // Mark as read
      await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('community_id', communityId)
        .eq('sender_id', partnerId)
        .eq('recipient_id', userId)
        .is('read_at', null);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessagesForConversation(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            await uploadImage(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [communityId, userId]);

  const uploadImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'ru' ? 'Файл слишком большой (макс. 10MB)' : 'File too large (max 10MB)');
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${communityId}/private-chat/${userId}/${Date.now()}.${fileExt}`;

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        await sendMessage(null, url);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (text: string | null, imageUrl: string | null = null) => {
    const recipientId = selectedConversation || selectedRecipient;
    if (!recipientId || (!text?.trim() && !imageUrl)) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          community_id: communityId,
          content_text: text?.trim() || '',
          image_url: imageUrl
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedRecipient(null);
      
      if (!selectedConversation) {
        setSelectedConversation(recipientId);
      }
      
      fetchConversations();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    sendMessage(newMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter(m => 
    m.user?.real_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPartner = selectedConversation 
    ? conversations.find(c => c.partnerId === selectedConversation)?.partner
    : selectedRecipient 
      ? members.find(m => m.user_id === selectedRecipient)?.user
      : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {language === 'ru' ? 'Приватный чат' : 'Private Chat'}
        </h3>
      </div>

      <div className="flex h-[500px]">
        {/* Left panel - Conversations list */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {language === 'ru' ? 'Нет сообщений' : 'No messages'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map(conv => (
                  <button
                    key={conv.partnerId}
                    onClick={() => {
                      setSelectedConversation(conv.partnerId);
                      setSelectedRecipient(null);
                    }}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                      selectedConversation === conv.partnerId && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conv.partner.avatar_url || ''} />
                        <AvatarFallback>
                          {conv.partner.real_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm truncate">
                            {conv.partner.real_name || 'Anonymous'}
                          </span>
                          {conv.partnerId === communityOwnerId && (
                            <span className="text-xs text-muted-foreground">
                              ({language === 'ru' ? 'автор' : 'author'})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.content_text || (conv.lastMessage.image_url ? '📷' : '')}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel - Chat or new message form */}
        <div className="flex-1 flex flex-col">
          {selectedConversation || selectedRecipient ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedConversation(null);
                    setSelectedRecipient(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedPartner?.avatar_url || ''} />
                  <AvatarFallback>
                    {selectedPartner?.real_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {selectedPartner?.real_name || 'Anonymous'}
                </span>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_id === userId ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          msg.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {msg.image_url && (
                          <img 
                            src={msg.image_url} 
                            alt="" 
                            className="rounded-md max-w-full mb-2 cursor-pointer"
                            onClick={() => window.open(msg.image_url!, '_blank')}
                          />
                        )}
                        {msg.content_text && (
                          <p className="text-sm whitespace-pre-wrap">{msg.content_text}</p>
                        )}
                        <p className={cn(
                          "text-xs mt-1",
                          msg.sender_id === userId 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(msg.created_at), {
                            addSuffix: true,
                            locale: language === 'ru' ? ru : enUS
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'}
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
                        onChange={handleFileSelect}
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
                    
                    {/* Emoji picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg">
                        <div className="grid grid-cols-8 gap-1">
                          {EMOJI_LIST.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => addEmoji(emoji)}
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
            </>
          ) : (
            /* New conversation form */
            <div className="flex-1 flex flex-col p-4">
              <h4 className="font-medium mb-3">
                {language === 'ru' ? 'Новое сообщение' : 'New Message'}
              </h4>
              
              {/* Member search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ru' ? 'Поиск участника...' : 'Search member...'}
                  className="pl-9"
                />
              </div>

              {/* Members list */}
              <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-1">
                  {filteredMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedRecipient(member.user_id)}
                      className={cn(
                        "w-full p-2 rounded-lg text-left flex items-center gap-2 hover:bg-muted/50 transition-colors",
                        selectedRecipient === member.user_id && "bg-muted"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar_url || ''} />
                        <AvatarFallback>
                          {member.user?.real_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {member.user?.real_name || 'Anonymous'}
                      </span>
                      {member.user_id === communityOwnerId && (
                        <span className="text-xs text-muted-foreground">
                          ({language === 'ru' ? 'автор' : 'author'})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Message input for new conversation */}
              {selectedRecipient && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'}
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
                          onChange={handleFileSelect}
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
                                onClick={() => addEmoji(emoji)}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
