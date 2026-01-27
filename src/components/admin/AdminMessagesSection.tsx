import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content_text: string;
  created_at: string;
  read_at: string | null;
  sender_email?: string;
}

export function AdminMessagesSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"moderator" | "superadmin">("moderator");

  useEffect(() => {
    loadMessages();
  }, [roleFilter]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Get users with the selected role
      const roleToQuery = roleFilter === "superadmin" ? "superuser" : "moderator";
      
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", roleToQuery);

      if (!roleUsers || roleUsers.length === 0) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const userIds = roleUsers.map(r => r.user_id);

      // Get messages sent to these users
      const { data: messagesData, error } = await supabase
        .from("direct_messages")
        .select("*")
        .in("recipient_id", userIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get sender profiles
      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .rpc("get_public_profiles", { profile_ids: senderIds });

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const messagesWithSenders = messagesData.map(m => ({
          ...m,
          sender_email: profileMap.get(m.sender_id)?.real_name || "Неизвестный"
        }));

        setMessages(messagesWithSenders);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Сообщения</h2>
        <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as "moderator" | "superadmin")}>
          <TabsList>
            <TabsTrigger value="moderator">Moderator</TabsTrigger>
            <TabsTrigger value="superadmin">Superadmin</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Нет сообщений
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {messages.map((message) => (
              <Card key={message.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">{message.sender_email}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), "dd MMM yyyy HH:mm", { locale: ru })}
                  </span>
                </div>
                <p className="text-sm">{message.content_text}</p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
