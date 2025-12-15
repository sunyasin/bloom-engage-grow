import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Plus, Edit, GripVertical, Loader2, Check } from 'lucide-react';
import { SubscriptionTierDialog } from './SubscriptionTierDialog';

interface SubscriptionTier {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
}

interface SubscriptionTiersManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
}

const FEATURE_LABELS: Record<string, { ru: string; en: string }> = {
  community_access: { ru: 'Доступ к сообществу', en: 'Community access' },
  courses_all: { ru: 'Все курсы', en: 'All courses' },
  courses_selected: { ru: 'Выбранные курсы', en: 'Selected courses' },
  call_replays: { ru: 'Записи созвонов', en: 'Call replays' },
  group_calls: { ru: 'Живые созвоны', en: 'Live calls' },
  private_chat: { ru: 'Приватный чат', en: 'Private chat' },
  discounts: { ru: 'Скидки', en: 'Discounts' },
};

export function SubscriptionTiersManager({
  open,
  onOpenChange,
  communityId,
}: SubscriptionTiersManagerProps) {
  const { language } = useI18n();
  const { toast } = useToast();
  
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [draggedTier, setDraggedTier] = useState<string | null>(null);
  const [dragOverTier, setDragOverTier] = useState<string | null>(null);

  const fetchTiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('community_id', communityId)
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Parse features from JSON if needed
      const parsedTiers = (data || []).map(tier => ({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features : [],
      })) as SubscriptionTier[];
      setTiers(parsedTiers);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchTiers();
    }
  }, [open, communityId]);

  const handleAddTier = () => {
    setSelectedTier(null);
    setEditDialogOpen(true);
  };

  const handleEditTier = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setEditDialogOpen(true);
  };

  const handleToggleActive = async (tier: SubscriptionTier) => {
    const { error } = await supabase
      .from('subscription_tiers')
      .update({ is_active: !tier.is_active })
      .eq('id', tier.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchTiers();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tierId: string) => {
    setDraggedTier(tierId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    if (tierId !== draggedTier) {
      setDragOverTier(tierId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTier(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTierId: string) => {
    e.preventDefault();
    if (!draggedTier || draggedTier === targetTierId) return;

    const draggedIndex = tiers.findIndex(t => t.id === draggedTier);
    const targetIndex = tiers.findIndex(t => t.id === targetTierId);

    const newTiers = [...tiers];
    const [removed] = newTiers.splice(draggedIndex, 1);
    newTiers.splice(targetIndex, 0, removed);

    // Update sort_order for all tiers
    const updates = newTiers.map((tier, index) => ({
      id: tier.id,
      sort_order: index,
    }));

    setTiers(newTiers.map((t, i) => ({ ...t, sort_order: i })));
    setDraggedTier(null);
    setDragOverTier(null);

    // Update in database
    for (const update of updates) {
      await supabase
        .from('subscription_tiers')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
  };

  const handleDragEnd = () => {
    setDraggedTier(null);
    setDragOverTier(null);
  };

  const formatPrice = (tier: SubscriptionTier) => {
    if (tier.is_free) return language === 'ru' ? 'Бесплатно' : 'Free';
    
    const monthly = tier.price_monthly || 0;
    const yearly = tier.price_yearly || 0;
    
    if (monthly > 0 && yearly > 0) {
      return `${monthly} ${tier.currency}/${language === 'ru' ? 'мес' : 'mo'} / ${yearly} ${tier.currency}/${language === 'ru' ? 'год' : 'yr'}`;
    }
    if (monthly > 0) {
      return `${monthly} ${tier.currency}/${language === 'ru' ? 'мес' : 'mo'}`;
    }
    if (yearly > 0) {
      return `${yearly} ${tier.currency}/${language === 'ru' ? 'год' : 'yr'}`;
    }
    return language === 'ru' ? 'Бесплатно' : 'Free';
  };

  const maxSortOrder = tiers.length > 0 ? Math.max(...tiers.map(t => t.sort_order)) : -1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Настройки подписок' : 'Subscription Settings'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {language === 'ru' 
                  ? 'Настройте уровни подписки для вашего сообщества' 
                  : 'Configure subscription tiers for your community'}
              </p>
              <Button onClick={handleAddTier} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ru' ? 'Добавить уровень' : 'Add tier'}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tiers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  {language === 'ru' 
                    ? 'Пока нет уровней подписки' 
                    : 'No subscription tiers yet'}
                </p>
                <Button onClick={handleAddTier} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Создать первый уровень' : 'Create first tier'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <Card
                    key={tier.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tier.id)}
                    onDragOver={(e) => handleDragOver(e, tier.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, tier.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 cursor-move transition-all ${
                      draggedTier === tier.id ? 'opacity-50' : ''
                    } ${
                      dragOverTier === tier.id ? 'border-primary border-2' : ''
                    } ${
                      !tier.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-muted-foreground mt-1">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{tier.name}</h3>
                          {tier.is_free && (
                            <Badge variant="secondary">
                              {language === 'ru' ? 'Бесплатный' : 'Free'}
                            </Badge>
                          )}
                          {!tier.is_active && (
                            <Badge variant="outline" className="text-muted-foreground">
                              {language === 'ru' ? 'Выключен' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-primary font-medium mb-2">
                          {formatPrice(tier)}
                        </p>
                        
                        {tier.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {tier.description}
                          </p>
                        )}
                        
                        {tier.features.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tier.features.map(feature => (
                              <span
                                key={feature}
                                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                <Check className="h-3 w-3 text-primary" />
                                {FEATURE_LABELS[feature]?.[language] || feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tier.is_active}
                          onCheckedChange={() => handleToggleActive(tier)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTier(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionTierDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tier={selectedTier}
        communityId={communityId}
        maxSortOrder={maxSortOrder}
        onSaved={fetchTiers}
      />
    </>
  );
}
