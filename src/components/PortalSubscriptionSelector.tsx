import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Loader2, Check } from 'lucide-react';

interface PortalSubscription {
  id: string;
  name: string;
  badge_text: string;
  description: string | null;
  price: number;
  billing_period: string;
  payment_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface PortalSubscriptionSelectorProps {
  userId: string | undefined;
  onSubscriptionSelected?: () => void;
}

export function PortalSubscriptionSelector({ userId, onSubscriptionSelected }: PortalSubscriptionSelectorProps) {
  const { toast } = useToast();
  const { language } = useI18n();
  const [subscriptions, setSubscriptions] = useState<PortalSubscription[]>([]);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
    if (userId) {
      loadCurrentSubscription();
    }
  }, [userId]);

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('portal_subscriptions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('portal_subscription_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setCurrentSubscriptionId(data?.portal_subscription_id || null);
    } catch (error: any) {
      console.error('Error loading current subscription:', error);
    }
  };

  const handleCreateCommunity = (subscription: PortalSubscription) => {
    if (subscription.payment_url) {
      window.open(subscription.payment_url, '_blank');
    }
    onSubscriptionSelected?.();
  };

  const formatPrice = (subscription: PortalSubscription) => {
    if (subscription.price === 0) {
      return language === 'ru' ? 'Бесплатно' : 'Free';
    }

    const periodText = subscription.billing_period === 'monthly'
      ? (language === 'ru' ? 'месяц' : 'month')
      : (language === 'ru' ? 'год' : 'year');

    return `${subscription.price} ₽ / ${periodText}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {language === 'ru' ? 'Нет доступных подписок' : 'No subscriptions available'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subscriptions.map((subscription) => {
        const isCurrentSubscription = currentSubscriptionId === subscription.id;
        const isFree = subscription.price === 0;

        return (
          <Card
            key={subscription.id}
            className={`relative ${isCurrentSubscription ? 'border-primary border-2' : ''}`}
          >
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant={isFree ? 'secondary' : 'default'}>
                  {subscription.badge_text}
                </Badge>
                {isCurrentSubscription && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3" />
                    {language === 'ru' ? 'Текущая' : 'Current'}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{subscription.name}</CardTitle>
              {subscription.description && (
                <CardDescription className="mt-2">
                  {subscription.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-4">
                {formatPrice(subscription)}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleCreateCommunity(subscription)}
                disabled={isCurrentSubscription}
                className="w-full"
                variant={isFree ? 'outline' : 'default'}
              >
                {language === 'ru' ? 'Создать сообщество' : 'Create Community'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
