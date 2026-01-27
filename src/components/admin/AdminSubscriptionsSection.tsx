import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, addDays, isBefore } from "date-fns";
import { ru } from "date-fns/locale";

interface MembershipData {
  id: string;
  user_id: string;
  community_id: string;
  subscription_tier_id: string | null;
  status: string;
  started_at: string;
  expires_at: string | null;
  renewal_period: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string;
  community_name: string;
  tier_name: string | null;
  tier_id: number | null;
  last_payment_date: string | null;
}

export function AdminSubscriptionsSection() {
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIds, setShowIds] = useState(false);
  
  // Filters
  const [userIdFilter, setUserIdFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [expiringOnly, setExpiringOnly] = useState(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      // Fetch memberships with related data
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          community_id,
          subscription_tier_id,
          status,
          started_at,
          expires_at,
          renewal_period,
          created_at,
          updated_at
        `)
        .order("updated_at", { ascending: false });

      if (membershipsError) throw membershipsError;

      if (!membershipsData || membershipsData.length === 0) {
        setMemberships([]);
        setLoading(false);
        return;
      }

      // Get unique user_ids, community_ids, and tier_ids
      const userIds = [...new Set(membershipsData.map(m => m.user_id))];
      const communityIds = [...new Set(membershipsData.map(m => m.community_id))];
      const tierIds = [...new Set(membershipsData.map(m => m.subscription_tier_id).filter(Boolean))] as string[];

      // Fetch profiles
      const { data: profiles } = await supabase
        .rpc("get_public_profiles", { profile_ids: userIds });

      // We need emails too - fetch from profiles table directly for superuser
      const { data: profilesWithEmail } = await supabase
        .from("profiles")
        .select("id, email, real_name")
        .in("id", userIds);

      // Fetch communities
      const { data: communities } = await supabase
        .from("communities")
        .select("id, name")
        .in("id", communityIds);

      // Fetch subscription tiers
      const { data: tiers } = await supabase
        .from("subscription_tiers")
        .select("id, name, tier_id")
        .in("id", tierIds);

      // Fetch last transactions for each user-community pair
      const { data: transactions } = await supabase
        .from("transactions")
        .select("user_id, community_id, created_at, status")
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      // Create lookup maps
      const profileMap = new Map(profilesWithEmail?.map(p => [p.id, p]) || []);
      const communityMap = new Map(communities?.map(c => [c.id, c]) || []);
      const tierMap = new Map(tiers?.map(t => [t.id, t]) || []);

      // Group transactions by user-community to get last payment
      const lastPaymentMap = new Map<string, string>();
      transactions?.forEach(t => {
        const key = `${t.user_id}-${t.community_id}`;
        if (!lastPaymentMap.has(key)) {
          lastPaymentMap.set(key, t.created_at);
        }
      });

      // Combine data
      const enrichedMemberships: MembershipData[] = membershipsData.map(m => {
        const profile = profileMap.get(m.user_id);
        const community = communityMap.get(m.community_id);
        const tier = m.subscription_tier_id ? tierMap.get(m.subscription_tier_id) : null;
        const lastPayment = lastPaymentMap.get(`${m.user_id}-${m.community_id}`);

        return {
          ...m,
          user_name: profile?.real_name || null,
          user_email: profile?.email || "—",
          community_name: community?.name || "—",
          tier_name: tier?.name || null,
          tier_id: tier?.tier_id || null,
          last_payment_date: lastPayment || null,
        };
      });

      setMemberships(enrichedMemberships);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredMemberships = useMemo(() => {
    return memberships.filter(m => {
      // User ID filter
      if (userIdFilter && !m.user_id.toLowerCase().includes(userIdFilter.toLowerCase())) {
        return false;
      }
      // Email filter
      if (emailFilter && !m.user_email.toLowerCase().includes(emailFilter.toLowerCase())) {
        return false;
      }
      // Community filter
      if (communityFilter && !m.community_name.toLowerCase().includes(communityFilter.toLowerCase())) {
        return false;
      }
      // Expiring soon filter (< 7 days)
      if (expiringOnly && m.expires_at) {
        const expiresDate = new Date(m.expires_at);
        const sevenDaysFromNow = addDays(new Date(), 7);
        if (!isBefore(expiresDate, sevenDaysFromNow)) {
          return false;
        }
      }
      return true;
    });
  }, [memberships, userIdFilter, emailFilter, communityFilter, expiringOnly]);

  // Sort by user for Tab 1
  const sortedByUser = useMemo(() => {
    return [...filteredMemberships].sort((a, b) => {
      const nameA = a.user_name || a.user_email;
      const nameB = b.user_name || b.user_email;
      return nameA.localeCompare(nameB);
    });
  }, [filteredMemberships]);

  // Sort by community for Tab 2
  const sortedByCommunity = useMemo(() => {
    return [...filteredMemberships].sort((a, b) => {
      return a.community_name.localeCompare(b.community_name);
    });
  }, [filteredMemberships]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "dd.MM.yyyy HH:mm", { locale: ru });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      canceled: "bg-yellow-100 text-yellow-800",
      expired: "bg-red-100 text-red-800",
      trial: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiresDate = new Date(expiresAt);
    const sevenDaysFromNow = addDays(new Date(), 7);
    return isBefore(expiresDate, sevenDaysFromNow);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Подписки</h2>

      {/* Global Controls */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="showIds"
            checked={showIds}
            onCheckedChange={(checked) => setShowIds(checked === true)}
          />
          <Label htmlFor="showIds">Показывать ID</Label>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {showIds && (
          <Input
            placeholder="Фильтр по user_id..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
          />
        )}
        <Input
          placeholder="Фильтр по email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
        <Input
          placeholder="Фильтр по сообществу..."
          value={communityFilter}
          onChange={(e) => setCommunityFilter(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="expiringOnly"
            checked={expiringOnly}
            onCheckedChange={(checked) => setExpiringOnly(checked === true)}
          />
          <Label htmlFor="expiringOnly" className="text-sm">Истекают &lt;7 дней</Label>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Пользователи → Подписки</TabsTrigger>
          <TabsTrigger value="communities">Сообщества → Подписки</TabsTrigger>
        </TabsList>

        {/* Tab 1: Users-Subscriptions */}
        <TabsContent value="users">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : sortedByUser.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showIds && <TableHead className="w-[200px]">User ID</TableHead>}
                    <TableHead>Имя</TableHead>
                    <TableHead>Email</TableHead>
                    {showIds && <TableHead className="w-[200px]">Community ID</TableHead>}
                    <TableHead>Сообщество</TableHead>
                    {showIds && <TableHead>Tier ID</TableHead>}
                    <TableHead>Тариф</TableHead>
                    <TableHead>Последняя оплата</TableHead>
                    <TableHead>Истекает</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Период</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByUser.map((m) => (
                    <TableRow key={m.id} className={isExpiringSoon(m.expires_at) ? "bg-red-50" : ""}>
                      {showIds && <TableCell className="font-mono text-xs">{m.user_id}</TableCell>}
                      <TableCell>{m.user_name || "—"}</TableCell>
                      <TableCell>{m.user_email}</TableCell>
                      {showIds && <TableCell className="font-mono text-xs">{m.community_id}</TableCell>}
                      <TableCell>{m.community_name}</TableCell>
                      {showIds && <TableCell>{m.tier_id || "—"}</TableCell>}
                      <TableCell>{m.tier_name || "—"}</TableCell>
                      <TableCell>{formatDate(m.last_payment_date)}</TableCell>
                      <TableCell className={isExpiringSoon(m.expires_at) ? "text-red-600 font-medium" : ""}>
                        {formatDate(m.expires_at)}
                      </TableCell>
                      <TableCell>{getStatusBadge(m.status)}</TableCell>
                      <TableCell>{m.renewal_period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Communities-Subscriptions */}
        <TabsContent value="communities">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : sortedByCommunity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showIds && <TableHead className="w-[200px]">Community ID</TableHead>}
                    <TableHead>Сообщество</TableHead>
                    {showIds && <TableHead className="w-[200px]">User ID</TableHead>}
                    <TableHead>Email</TableHead>
                    <TableHead>Имя</TableHead>
                    {showIds && <TableHead>Tier ID</TableHead>}
                    <TableHead>Тариф</TableHead>
                    <TableHead>Последняя оплата</TableHead>
                    <TableHead>Истекает</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Период</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByCommunity.map((m) => (
                    <TableRow key={m.id} className={isExpiringSoon(m.expires_at) ? "bg-red-50" : ""}>
                      {showIds && <TableCell className="font-mono text-xs">{m.community_id}</TableCell>}
                      <TableCell>{m.community_name}</TableCell>
                      {showIds && <TableCell className="font-mono text-xs">{m.user_id}</TableCell>}
                      <TableCell>{m.user_email}</TableCell>
                      <TableCell>{m.user_name || "—"}</TableCell>
                      {showIds && <TableCell>{m.tier_id || "—"}</TableCell>}
                      <TableCell>{m.tier_name || "—"}</TableCell>
                      <TableCell>{formatDate(m.last_payment_date)}</TableCell>
                      <TableCell className={isExpiringSoon(m.expires_at) ? "text-red-600 font-medium" : ""}>
                        {formatDate(m.expires_at)}
                      </TableCell>
                      <TableCell>{getStatusBadge(m.status)}</TableCell>
                      <TableCell>{m.renewal_period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-4 text-sm text-muted-foreground">
        Всего записей: {filteredMemberships.length}
      </div>
    </Card>
  );
}
