import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, Percent } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ReferralStats {
  totalReferred: number;
  payingReferred: number;
  discount: number;
}

interface ReferralBlockProps {
  referralCode: string | null;
  userId: string;
}

export function ReferralBlock({ referralCode, userId }: ReferralBlockProps) {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    payingReferred: 0,
    discount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { language } = useI18n();

  const referralLink = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : "";

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  const fetchStats = async () => {
    try {
      // Get referral stats
      const { data: referrals, error } = await supabase
        .from("referral_stats")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const totalReferred = referrals?.length || 0;
      const payingReferred = referrals?.filter((r) => r.is_paying).length || 0;

      // Calculate discount
      let discount = 0;
      if (payingReferred === 1) {
        discount = 10;
      } else if (payingReferred > 1) {
        discount = Math.min(10 + (payingReferred - 1), 50);
      }

      setStats({
        totalReferred,
        payingReferred,
        discount,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: language === "ru" ? "Скопировано!" : "Copied!",
        description:
          language === "ru"
            ? "Ссылка скопирована в буфер обмена"
            : "Link copied to clipboard",
      });
    } catch {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description:
          language === "ru"
            ? "Не удалось скопировать ссылку"
            : "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  if (!referralCode) {
    return null;
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Gift className="h-6 w-6 text-primary mt-1" />
        <div>
          <h3 className="text-lg font-semibold">
            {language === "ru"
              ? "Партнерская программа"
              : "Referral Program"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "ru"
              ? "Получите -10% пожизненно за первого платящего подписчика и -1% за каждого следующего (максимум -50%)"
              : "Get -10% lifetime discount for your first paying subscriber and -1% for each next one (max -50%)"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {language === "ru" ? "Ваша партнерская ссылка" : "Your referral link"}
        </label>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totalReferred}</p>
            <p className="text-xs text-muted-foreground">
              {language === "ru" ? "Приглашено" : "Invited"}
            </p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Gift className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.payingReferred}</p>
            <p className="text-xs text-muted-foreground">
              {language === "ru" ? "Оплатили" : "Paid"}
            </p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {stats.discount > 0 ? `-${stats.discount}%` : "0%"}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "ru" ? "Ваша скидка" : "Your discount"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
