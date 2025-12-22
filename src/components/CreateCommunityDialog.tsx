import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface CreateCommunityDialogProps {
  user: User | null;
  onCommunityCreated?: () => void;
}

export function CreateCommunityDialog({ user, onCommunityCreated }: CreateCommunityDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');

  const handleCreate = async () => {
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          visibility,
          slug,
          creator_id: user.id,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner member
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: 'owner',
          is_active: true,
        });

      toast({
        title: t('community.created'),
        description: t('community.createdDesc'),
      });

      setOpen(false);
      setName('');
      setDescription('');
      setVisibility('public');
      onCommunityCreated?.();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary gap-2">
          <Plus className="h-4 w-4" />
          {t('community.create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('community.create')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('community.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('community.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('community.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('community.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('community.visibility')}</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t('community.public')}</SelectItem>
                <SelectItem value="by_request">{t('community.byRequest')}</SelectItem>
                <SelectItem value="private">{t('community.private')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || !name.trim()}
            className="bg-gradient-primary"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('common.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
