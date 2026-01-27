import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { paymentsApi } from '@/lib/paymentsApi';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionPurchaseButtonProps {
  communityId: string;
  subscriptionTierId: string;
  tierName: string;
  price: number;
  moderatedAt?: string | null;
  disabled?: boolean;
  className?: string;
}

export function SubscriptionPurchaseButton({
  communityId,
  subscriptionTierId,
  tierName,
  price,
  moderatedAt,
  disabled = false,
  className
}: SubscriptionPurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);

  const handleSubscribe = async () => {
    // Check if tier is not moderated yet
    if (!moderatedAt) {
      setShowModerationDialog(true);
      return;
    }

    try {
      setIsLoading(true);

      const result = await paymentsApi.createSubscription({
        communityId,
        subscriptionTierId,
        returnUrl: `${window.location.origin}/payment/callback?transactionId={transactionId}`
      });

      window.location.href = result.confirmationUrl;

    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create payment');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSubscribe}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Subscribe for {price} ₽/month</>
        )}
      </Button>

      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ожидание регистрации</DialogTitle>
            <DialogDescription className="pt-2">
              Изменения в сообществе проходят регистрацию. Попробуйте снова через несколько часов.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
