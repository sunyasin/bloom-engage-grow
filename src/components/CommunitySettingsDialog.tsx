import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

interface CommunitySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    visibility?: string;
  };
  onUpdate: (updated: { name: string; description: string | null; cover_image_url: string | null; visibility: string }) => void;
  language: string;
}

export function CommunitySettingsDialog({
  open,
  onOpenChange,
  community,
  onUpdate,
  language
}: CommunitySettingsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [logoUrl, setLogoUrl] = useState(community.cover_image_url || '');
  const [visibility, setVisibility] = useState(community.visibility || 'public');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Выберите изображение' : 'Please select an image',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Файл слишком большой (макс. 5MB)' : 'File too large (max 5MB)',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${community.id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `community-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({
        title: language === 'ru' ? 'Успешно' : 'Success',
        description: language === 'ru' ? 'Логотип загружен' : 'Logo uploaded'
      });
    } catch (error: any) {
      toast({
        title: language === 'ru' ? 'Ошибка загрузки' : 'Upload error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Название обязательно' : 'Name is required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          cover_image_url: logoUrl || null,
          visibility
        })
        .eq('id', community.id);

      if (error) throw error;

      onUpdate({
        name: name.trim(),
        description: description.trim() || null,
        cover_image_url: logoUrl || null,
        visibility
      });
      
      toast({
        title: language === 'ru' ? 'Сохранено' : 'Saved',
        description: language === 'ru' ? 'Настройки обновлены' : 'Settings updated'
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ru' ? 'Настройки сообщества' : 'Community Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logo upload */}
          <div className="space-y-2">
            <Label>{language === 'ru' ? 'Логотип' : 'Logo'}</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-20 w-20 rounded-lg object-cover border border-border"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ru' ? 'Загрузить' : 'Upload'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ru' ? 'JPG, PNG до 5MB' : 'JPG, PNG up to 5MB'}
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{language === 'ru' ? 'Название' : 'Name'}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'ru' ? 'Название сообщества' : 'Community name'}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{language === 'ru' ? 'Описание' : 'Description'}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'ru' ? 'Описание сообщества' : 'Community description'}
              rows={4}
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">
                {language === 'ru' ? 'Видимость для всех' : 'Visible to everyone'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === 'ru' 
                  ? 'Вы всегда будете видеть сообщество как автор' 
                  : 'You will always see the community as the author'}
              </p>
            </div>
            <Switch
              id="visibility"
              checked={visibility === 'public'}
              onCheckedChange={(checked) => setVisibility(checked ? 'public' : 'private')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ru' ? 'Отмена' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {language === 'ru' ? 'Сохранить' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
