import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TierWithDetails {
  id: string;
  tier_id: number;
  name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  payment_url: string | null;
  moderated_at: string | null;
  is_active: boolean;
  is_free: boolean;
  community_id: string;
  community_name: string;
  author_email: string;
}

type ViewMode = "pending" | "active";

export function AdminTiersModerationSection() {
  const [tiers, setTiers] = useState<TierWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [selectedForApproval, setSelectedForApproval] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTiers();
  }, [viewMode]);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      // Build query based on view mode
      let query = supabase
        .from("subscription_tiers")
        .select(`
          id,
          tier_id,
          name,
          price_monthly,
          price_yearly,
          currency,
          payment_url,
          moderated_at,
          is_active,
          is_free,
          community_id
        `)
        .eq("is_free", false)
        .eq("is_active", true);

      if (viewMode === "pending") {
        query = query.is("moderated_at", null);
      } else {
        query = query.not("moderated_at", "is", null);
      }

      const { data: tiersData, error } = await query.order("tier_id", { ascending: true });

      if (error) throw error;

      if (!tiersData || tiersData.length === 0) {
        setTiers([]);
        setIsLoading(false);
        return;
      }

      // Get community details
      const communityIds = [...new Set(tiersData.map(t => t.community_id))];
      const { data: communities } = await supabase
        .from("communities")
        .select("id, name, creator_id")
        .in("id", communityIds);

      const communityMap = new Map(communities?.map(c => [c.id, c]) || []);

      // Get author profiles
      const creatorIds = [...new Set(communities?.map(c => c.creator_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine data
      const tiersWithDetails: TierWithDetails[] = tiersData.map(tier => {
        const community = communityMap.get(tier.community_id);
        const profile = community ? profileMap.get(community.creator_id) : null;
        
        return {
          ...tier,
          community_name: community?.name || "Неизвестно",
          author_email: profile?.email || "Неизвестно"
        };
      });

      setTiers(tiersWithDetails);
      setEditedUrls({});
      setSelectedForApproval(new Set());
    } catch (error) {
      console.error("Error loading tiers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тарифы",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (tierId: string, url: string) => {
    setEditedUrls(prev => ({ ...prev, [tierId]: url }));
  };

  const toggleApproval = (tierId: string) => {
    setSelectedForApproval(prev => {
      const next = new Set(prev);
      if (next.has(tierId)) {
        next.delete(tierId);
      } else {
        next.add(tierId);
      }
      return next;
    });
  };

  const handleSave = async (tier: TierWithDetails) => {
    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};
      
      // Check if URL was edited
      if (editedUrls[tier.id] !== undefined) {
        updates.payment_url = editedUrls[tier.id] || null;
      }
      
      // Check if selected for approval
      if (selectedForApproval.has(tier.id)) {
        updates.moderated_at = new Date().toISOString();
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "Нет изменений",
          description: "Внесите изменения перед сохранением"
        });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("subscription_tiers")
        .update(updates)
        .eq("id", tier.id);

      if (error) throw error;

      toast({
        title: "Сохранено",
        description: selectedForApproval.has(tier.id) 
          ? "Тариф одобрен" 
          : "Изменения сохранены"
      });

      // Reload tiers
      loadTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (tier: TierWithDetails) => {
    const parts: string[] = [];
    if (tier.price_monthly) {
      parts.push(`${tier.price_monthly} ${tier.currency}/мес`);
    }
    if (tier.price_yearly) {
      parts.push(`${tier.price_yearly} ${tier.currency}/год`);
    }
    return parts.join(", ") || "—";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Модерация тарифов</h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="pending">На модерации</TabsTrigger>
            <TabsTrigger value="active">Активные</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {viewMode === "pending" 
            ? "Нет тарифов на модерации" 
            : "Нет активных тарифов"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сообщество</TableHead>
                <TableHead>Email автора</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Tier ID</TableHead>
                <TableHead className="min-w-[250px]">Payment URL</TableHead>
                {viewMode === "pending" && <TableHead>Одобрить</TableHead>}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.community_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tier.author_email}</TableCell>
                  <TableCell>{formatPrice(tier)}</TableCell>
                  <TableCell>{tier.tier_id}</TableCell>
                  <TableCell>
                    <Input
                      value={editedUrls[tier.id] ?? tier.payment_url ?? ""}
                      onChange={(e) => handleUrlChange(tier.id, e.target.value)}
                      placeholder="https://..."
                      className="min-w-[200px]"
                    />
                  </TableCell>
                  {viewMode === "pending" && (
                    <TableCell>
                      <Checkbox
                        checked={selectedForApproval.has(tier.id)}
                        onCheckedChange={() => toggleApproval(tier.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSave(tier)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
