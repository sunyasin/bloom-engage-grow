import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { startOfMonth, endOfMonth } from "date-fns";

interface FinanceTransaction {
  id: string;
  community_name: string;
  tier_name: string;
  amount: number;
  date: string;
  type: "payment" | "payout";
}

export function useFinanceData(month: Date) {
  const [data, setData] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setData([]);
        setLoading(false);
        return;
      }

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // Получаем транзакции за период (оплачено)
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          created_at,
          community:communities!transactions_community_id_fkey(name),
          subscription_tier:subscription_tiers!transactions_subscription_tier_id_fkey(name)
        `)
        .eq("user_id", user.id)
        .eq("status", "paid")
        .is("payout_id", null)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });

      if (transError) {
        console.error("Transactions error:", transError);
        throw transError;
      }

      // Формируем массив платежей
      const payments: FinanceTransaction[] = transactions?.map((t) => ({
        id: t.id,
        community_name: t.community?.name || "Unknown",
        tier_name: t.subscription_tier?.name || "Unknown",
        amount: Number(t.amount),
        date: t.created_at,
        type: "payment" as const,
      })) || [];

      // Получаем выплаты
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: payouts, error: payoutError } = await (supabase as any)
        .from("community_payouts")
        .select("id, amount, paid_at, community:communities!community_payouts_community_id_fkey(name)")
        .eq("author_id", user.id)
        .not("paid_at", "is", null)
        .gte("paid_at", monthStart.toISOString())
        .lte("paid_at", monthEnd.toISOString())
        .order("paid_at", { ascending: false });

      if (payoutError) {
        console.error("Payouts error:", payoutError);
        throw payoutError;
      }

      // Формируем массив выплат
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payoutItems: FinanceTransaction[] = payouts?.map((p: any) => ({
        id: p.id,
        community_name: p.community?.name || "Unknown",
        tier_name: "Выплата",
        amount: Number(p.amount),
        date: p.paid_at,
        type: "payout" as const,
      })) || [];

      // Объединяем и сортируем по дате
      const result = [...payments, ...payoutItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setData(result);
    } catch (err) {
      console.error("Error fetching finance data:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null 
          ? JSON.stringify(err) 
          : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
