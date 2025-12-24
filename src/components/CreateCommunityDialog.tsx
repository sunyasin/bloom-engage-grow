import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { PortalSubscriptionSelector } from './PortalSubscriptionSelector';

interface CreateCommunityDialogProps {
  user: User | null;
  onCommunityCreated?: () => void;
}

export function CreateCommunityDialog({ user, onCommunityCreated }: CreateCommunityDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary gap-2">
          <Plus className="h-4 w-4" />
          {t('community.create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('community.create')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <PortalSubscriptionSelector
            userId={user.id}
            onSubscriptionSelected={onCommunityCreated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
