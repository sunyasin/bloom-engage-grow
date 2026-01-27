import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubscriptionPurchaseButton } from './SubscriptionPurchaseButton';
import { supabase } from '@/lib/supabaseClient';
import { paymentsApi } from '@/lib/paymentsApi';
import { Loader2, Check } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  is_free: boolean;
  features: any;
  moderated_at: string | null;
}

interface SubscriptionTiersListProps {
  communityId: string;
  userId?: string;
}

export function SubscriptionTiersList({ communityId, userId }: SubscriptionTiersListProps) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [activeMembership, setActiveMembership] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTiers();
    if (userId) {
      loadActiveMembership();
    }
  }, [communityId, userId]);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveMembership = async () => {
    try {
      const result = await paymentsApi.getMemberships(communityId);
      const activeMembership = result.memberships.find(m => m.isActive);
      setActiveMembership(activeMembership);
    } catch (error) {
      console.error('Error loading membership:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No subscription tiers available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tiers.map((tier) => {
        const isCurrentTier = activeMembership?.subscription_tier_id === tier.id;
        const features = Array.isArray(tier.features) ? tier.features : [];

        return (
          <Card key={tier.id} className={isCurrentTier ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{tier.name}</CardTitle>
                {isCurrentTier && (
                  <Badge variant="default">Current</Badge>
                )}
                {tier.is_free && (
                  <Badge variant="secondary">Free</Badge>
                )}
              </div>
              {tier.description && (
                <CardDescription>{tier.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {tier.is_free ? (
                  <div className="text-3xl font-bold">Free</div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">
                      {tier.price_monthly} {tier.currency}
                    </div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </>
                )}
              </div>

              {features.length > 0 && (
                <ul className="space-y-2">
                  {features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              {tier.is_free ? (
                <div className="w-full text-center text-sm text-muted-foreground">
                  Available to everyone
                </div>
              ) : (
                <SubscriptionPurchaseButton
                  communityId={communityId}
                  subscriptionTierId={tier.id}
                  tierName={tier.name}
                  price={tier.price_monthly || 0}
                  moderatedAt={tier.moderated_at}
                  disabled={isCurrentTier || !userId}
                  className="w-full"
                />
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
