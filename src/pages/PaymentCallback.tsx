import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      setStatus('failed');
      return;
    }

    checkTransactionStatus(transactionId);

    const interval = setInterval(() => {
      checkTransactionStatus(transactionId);
    }, 3000);

    return () => clearInterval(interval);
  }, [searchParams]);

  const checkTransactionStatus = async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          community:communities(id, name, slug),
          subscription_tier:subscription_tiers(name)
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;

      setTransaction(data);

      if (data.status === 'paid') {
        setStatus('success');

        const metadata = data.metadata as any;
        if (metadata?.type === 'portal_subscription' && metadata?.portal_subscription_id) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ portal_subscription_id: metadata.portal_subscription_id })
              .eq('id', user.id);
          }
        }
      } else if (data.status === 'failed') {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Error checking transaction:', error);
      setStatus('failed');
    }
  };

  const handleGoToCommunity = () => {
    const metadata = transaction?.metadata as any;
    if (metadata?.type === 'portal_subscription') {
      navigate('/my-profile');
    } else if (transaction?.community?.slug) {
      navigate(`/community/${transaction.community.slug}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
            {status === 'failed' && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-center">
            {status === 'loading' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we confirm your payment'}
            {status === 'success' && 'Your subscription has been activated'}
            {status === 'failed' && 'Something went wrong with your payment'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
{transaction && (
            <div className="space-y-2 text-sm">
              {(transaction.metadata as any)?.type === 'portal_subscription' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">Portal Subscription</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium">{transaction.description}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Community:</span>
                    <span className="font-medium">{transaction.community?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">{transaction.subscription_tier?.name}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{transaction.amount} {transaction.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{transaction.status}</span>
              </div>
            </div>
          )}

<div className="pt-4 space-y-2">
            {status === 'success' && (
              <Button onClick={handleGoToCommunity} className="w-full">
                {(transaction?.metadata as any)?.type === 'portal_subscription'
                  ? 'Go to Profile'
                  : 'Go to Community'}
              </Button>
            )}
            {status === 'failed' && (
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Go to Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
