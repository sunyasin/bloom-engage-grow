import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Edit2 } from 'lucide-react';

interface Community {
  id: string;
  name: string;
}

interface GalleryCollection {
  id: number;
  name: string;
  year: number;
  thumbnail_url: string | null;
  community_id: string | null;
}

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: Community[];
  userId: string;
  collection: GalleryCollection;
  onCollectionUpdated: () => void;
}

export function EditCollectionDialog({
  open,
  onOpenChange,
  communities,
  userId,
  collection,
  onCollectionUpdated
}: EditCollectionDialogProps) {
  const [name, setName] = useState(collection.name);
  const [year, setYear] = useState(collection.year.toString());
  const [communityId, setCommunityId] = useState(collection.community_id || '');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(collection.thumbnail_url);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (open) {
      setName(collection.name);
      setYear(collection.year.toString());
      setCommunityId(collection.community_id || '');
      setThumbnailPreview(collection.thumbnail_url);
      setThumbnail(null);
    }
  }, [open, collection]);

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

  // Транслитерация названия на латиницу
  const transliterate = (text: string): string => {
    const mapping: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      ' ': '_', '-': '_', '.': '_', ',': '_', '(': '_', ')': '_'
    };
    
    return text.split('').map(char => mapping[char] || char).join('')
      .replace(/[^a-z0-9_]/g, '')
      .toLowerCase();
  };

  // Сжатие изображения до 300x300
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        canvas.width = 300;
        canvas.height = 300;

        ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let thumbnailUrl: string | null = collection.thumbnail_url;

      // Если выбрано новое изображение
      if (thumbnail) {
        const resizedBlob = await resizeImage(thumbnail);
        const ext = 'jpg';
        const baseName = transliterate(name || 'collection');
        const fileName = `${baseName}_${year}_thumbnail.${ext}`;

        // Создаем FormData для локальной загрузки
        const formData = new FormData();
        formData.append('file', resizedBlob, fileName);
        formData.append('folder', 'gallery/thumbnails');

        const uploadResponse = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload thumbnail');
        }

        const uploadResult = await uploadResponse.json();
        thumbnailUrl = uploadResult.url;
      }

      const { error } = await supabase
        .from('gallery_collections')
        .update({
          name,
          year: parseInt(year),
          community_id: communityId || null,
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', collection.id);

      if (error) throw error;

      onCollectionUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (thumbnailPreview && !thumbnailPreview.startsWith('http')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
      setThumbnail(null);
      setThumbnailPreview(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать сборник</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Thumbnail */}
            <div className="grid gap-2">
              <Label>Обложка (300×300)</Label>
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
                    src={thumbnailPreview}
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
                placeholder="Мой фото-блог"
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
              <Label htmlFor="community">Сообщество (необязательно)</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сообщество" />
                </SelectTrigger>
                <SelectContent>
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
