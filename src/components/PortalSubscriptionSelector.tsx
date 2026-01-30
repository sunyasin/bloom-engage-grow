import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Loader2, Check, Percent } from 'lucide-react';
import { paymentsApi } from '@/lib/paymentsApi';

interface PortalSubscription {
  id: string;
  name: string;
  badge_text: string;
  description: string | null;
  price: number;
  billing_period: string;
  payment_url: string | null;
  payment_url_10: string | null;
  payment_url_20: string | null;
  payment_url_30: string | null;
  payment_url_40: string | null;
  payment_url_50: string | null;
  is_active: boolean;
  sort_order: number;
  community_limit: number | null;
}

interface PortalSubscriptionSelectorProps {
  userId: string | undefined;
  onSubscriptionSelected?: () => void;
}

export function PortalSubscriptionSelector({ userId, onSubscriptionSelected }: PortalSubscriptionSelectorProps) {
  const { toast } = useToast();
  const { language } = useI18n();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<PortalSubscription[]>([]);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paidConfirmations, setPaidConfirmations] = useState<{ [key: string]: boolean }>({});
  const [userCommunitiesCount, setUserCommunitiesCount] = useState<number>(0);
  const [userDiscount, setUserDiscount] = useState<number>(0);

  useEffect(() => {
    loadSubscriptions();
    if (userId) {
      loadCurrentSubscription();
      loadUserCommunitiesCount();
      loadUserDiscount();
    }
  }, [userId]);

  const loadUserDiscount = async () => {
    if (!userId) return;
    try {
      // Get referral stats for calculating discount
      const { data: referrals, error } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const payingCount = referrals?.filter((r) => r.is_paying).length || 0;
      const discount = Math.min(payingCount * 10, 50);
      setUserDiscount(discount);
    } catch (error: any) {
      console.error('Error loading user discount:', error);
    }
  };

  const loadUserCommunitiesCount = async () => {
    if (!userId) return;
    try {
      const { count, error } = await supabase
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId);

      if (error) throw error;
      setUserCommunitiesCount(count || 0);
    } catch (error: any) {
      console.error('Error loading communities count:', error);
    }
  };

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
      const subscriptionId = data?.portal_subscription_id || null;
      setCurrentSubscriptionId(subscriptionId);

      if (subscriptionId) {
        setPaidConfirmations({ ...paidConfirmations, [subscriptionId]: true });
      }
    } catch (error: any) {
      console.error('Error loading current subscription:', error);
    }
  };

  const getPaymentUrlForDiscount = (subscription: PortalSubscription): string | null => {
    // Select payment URL based on user's discount level
    if (userDiscount >= 50 && subscription.payment_url_50) {
      return subscription.payment_url_50;
    } else if (userDiscount >= 40 && subscription.payment_url_40) {
      return subscription.payment_url_40;
    } else if (userDiscount >= 30 && subscription.payment_url_30) {
      return subscription.payment_url_30;
    } else if (userDiscount >= 20 && subscription.payment_url_20) {
      return subscription.payment_url_20;
    } else if (userDiscount >= 10 && subscription.payment_url_10) {
      return subscription.payment_url_10;
    }
    return subscription.payment_url;
  };

  const handlePayment = async (subscription: PortalSubscription) => {
    if (!userId) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Необходимо авторизоваться' : 'Authentication required',
        variant: 'destructive',
      });
      return;
    }

    const paymentUrl = getPaymentUrlForDiscount(subscription);
    
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      return;
    }

    setProcessingId(subscription.id);

    try {
      const returnUrl = `${window.location.origin}/my-profile`;
      const result = await paymentsApi.createPortalPayment({
        portalSubscriptionId: subscription.id,
        returnUrl,
      });

      if (result.isFree) {
        toast({
          title: language === 'ru' ? 'Успех' : 'Success',
          description: language === 'ru' ? 'Бесплатная подписка активирована' : 'Free subscription activated',
        });
        await loadCurrentSubscription();
        setPaidConfirmations({ ...paidConfirmations, [subscription.id]: true });
      } else if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
      }
    } catch (error: any) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateCommunity = async (subscription: PortalSubscription) => {
    if (!userId) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Необходимо авторизоваться' : 'Authentication required',
        variant: 'destructive',
      });
      return;
    }

    const isFree = subscription.price === 0;
    if (!isFree && !paidConfirmations[subscription.id]) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Подтвердите оплату перед созданием сообщества' : 'Please confirm payment before creating community',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(subscription.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ portal_subscription_id: subscription.id })
        .eq('id', userId);

      if (error) throw error;

      setCurrentSubscriptionId(subscription.id);
      navigate('/create-community');
    } catch (error: any) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const calculateDiscountedPrice = (price: number): number => {
    if (price === 0 || userDiscount === 0) return price;
    return Math.round(price * (1 - userDiscount / 100));
  };

  const formatPrice = (subscription: PortalSubscription) => {
    if (subscription.price === 0) {
      return language === 'ru' ? 'Бесплатно' : 'Free';
    }

    const periodText = subscription.billing_period === 'monthly'
      ? (language === 'ru' ? 'месяц' : 'month')
      : (language === 'ru' ? 'год' : 'year');

    const originalPrice = subscription.price;
    const discountedPrice = calculateDiscountedPrice(originalPrice);

    if (userDiscount > 0 && discountedPrice !== originalPrice) {
      return (
        <span className="flex flex-col">
          <span className="text-lg text-muted-foreground line-through">
            {originalPrice} ₽
          </span>
          <span>
            {discountedPrice} ₽ / {periodText}
          </span>
        </span>
      );
    }

    return `${originalPrice} ₽ / ${periodText}`;
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
    <div className="space-y-4">
      {/* Discount banner */}
      {userDiscount > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-primary rounded-full p-2">
            <Percent className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-primary">
              {language === 'ru' 
                ? `Ваша партнерская скидка: ${userDiscount}%` 
                : `Your referral discount: ${userDiscount}%`}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ru'
                ? 'Скидка применена к ценам ниже'
                : 'Discount applied to prices below'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((subscription) => {
          const isCurrentSubscription = currentSubscriptionId === subscription.id;
          const isFree = subscription.price === 0;
          const limit = subscription.community_limit;
          const isLimitReached = limit !== null && userCommunitiesCount >= limit;

          return (
            <Card
              key={subscription.id}
              className={`relative ${isCurrentSubscription ? 'border-primary border-2' : ''}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant={isFree ? 'secondary' : 'default'}>
                      {subscription.badge_text}
                    </Badge>
                    {userDiscount > 0 && !isFree && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        -{userDiscount}%
                      </Badge>
                    )}
                  </div>
                  {isCurrentSubscription && (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      {language === 'ru' ? 'Текущая' : 'Current'}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{subscription.name}</CardTitle>
                {subscription.description && (
                  <CardDescription
                    className="mt-2"
                    dangerouslySetInnerHTML={{ __html: subscription.description }}
                  />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-4">
                  {formatPrice(subscription)}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {!isFree && (
                  <>
                    <Button
                      onClick={() => handlePayment(subscription)}
                      disabled={isCurrentSubscription || processingId === subscription.id}
                      className="w-full"
                      variant="default"
                    >
                      {processingId === subscription.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {language === 'ru' ? 'Обработка...' : 'Processing...'}
                        </>
                      ) : (
                        language === 'ru' ? 'Оплатить' : 'Pay'
                      )}
                    </Button>

                    <div className="flex items-center space-x-2 w-full py-2">
                      <Checkbox
                        id={`paid-${subscription.id}`}
                        checked={paidConfirmations[subscription.id] || false}
                        onCheckedChange={(checked) => {
                          setPaidConfirmations({
                            ...paidConfirmations,
                            [subscription.id]: checked as boolean
                          });
                        }}
                        disabled={isCurrentSubscription}
                      />
                      <label
                        htmlFor={`paid-${subscription.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {language === 'ru' ? 'Я оплатил' : 'I paid'}
                      </label>
                    </div>
                  </>
                )}

                <Button
                  onClick={() => handleCreateCommunity(subscription)}
                  disabled={isLimitReached || (!isFree && !paidConfirmations[subscription.id])}
                  className="w-full"
                  variant={isFree ? 'outline' : 'default'}
                >
                  {isLimitReached 
                    ? (language === 'ru' ? `Лимит достигнут (${userCommunitiesCount}/${limit})` : `Limit reached (${userCommunitiesCount}/${limit})`)
                    : (language === 'ru' ? 'Создать сообщество' : 'Create Community')
                  }
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
