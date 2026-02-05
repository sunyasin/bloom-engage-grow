import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GALLERY_BUCKET, GALLERY_THUMBNAILS_FOLDER, generateGalleryFileName } from '@/lib/galleryStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';

interface Community {
  id: string;
  name: string;
}

interface Collection {
  id: number;
  name: string;
  year: number;
  community_id: string | null;
  thumbnail_url: string | null;
}

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  communities: Community[];
  onCollectionUpdated: () => void;
}

export function EditCollectionDialog({
  open,
  onOpenChange,
  collection,
  communities,
  onCollectionUpdated
}: EditCollectionDialogProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when collection changes
  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setYear(collection.year.toString());
      setCommunityId(collection.community_id || '');
      setThumbnailPreview(collection.thumbnail_url);
      setThumbnail(null);
    }
  }, [collection]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeThumbnail = () => {
    if (thumbnailPreview && !thumbnailPreview.startsWith('http')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnail(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;
    
    setLoading(true);

    try {
      let thumbnailUrl: string | null = thumbnailPreview;

      // Загружаем thumbnail если есть новое - напрямую в Supabase Storage
      if (thumbnail) {
        const fileName = generateGalleryFileName('thumbnail.jpg', GALLERY_THUMBNAILS_FOLDER);
        
        // Прямая загрузка в Supabase Storage (как в CommunitySettingsDialog)
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(fileName, thumbnail, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(GALLERY_BUCKET)
          .getPublicUrl(fileName);

        thumbnailUrl = publicUrl;
      }

      // Обновляем запись в Supabase
      const { error } = await supabase
        .from('gallery_collections')
        .update({
          name,
          year: parseInt(year),
          community_id: communityId && communityId !== 'none' ? communityId : null,
          thumbnail_url: thumbnailUrl
        })
        .eq('id', collection.id);

      if (error) throw error;

      // Вызываем колбэк с обновлёнными данными сборника
      onCollectionUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать сборник</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Thumbnail */}
            <div className="grid gap-2">
              <Label>Обложка</Label>
              {!thumbnailPreview ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Нажмите для загрузки
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={thumbnailPreview!}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg mx-auto"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removeThumbnail}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название сборника"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Год</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={2000}
                max={2100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="community">Сообщество</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Без сообщества" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без сообщества</SelectItem>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
