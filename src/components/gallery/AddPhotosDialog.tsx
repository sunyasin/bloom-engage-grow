import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface PhotoItem {
  file: File;
  preview: string;
  description: string;
  price: string;
}

interface AddPhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: number;
  userId: string;
  onPhotosAdded: () => void;
}

export function AddPhotosDialog({
  open,
  onOpenChange,
  collectionId,
  userId,
  onPhotosAdded
}: AddPhotosDialogProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newPhotos: PhotoItem[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
      price: ''
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const updatePhoto = (index: number, updates: Partial<PhotoItem>) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index] = { ...newPhotos[index], ...updates };
      return newPhotos;
    });
  };

  const handleSubmit = async () => {
    if (photos.length === 0) return;
    
    setUploading(true);
    
    try {
      // Создаем FormData для загрузки всех файлов
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append('files', photo.file);
      });
      formData.append('folder', `gallery/${collectionId}`);

      const uploadResponse = await fetch(`${API_URL}/api/upload-multiple`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photos');
      }

      const uploadResult = await uploadResponse.json();

      // Сохраняем записи в базу данных
      for (let i = 0; i < uploadResult.files.length; i++) {
        const fileData = uploadResult.files[i];
        const photo = photos[i];

        const { error: dbError } = await supabase
          .from('gallery_photos')
          .insert({
            url: fileData.url,
            description: photo.description || null,
            price: photo.price ? parseFloat(photo.price) : null,
            collection_id: collectionId,
            user_id: userId
          });
        
        if (dbError) throw dbError;
      }
      
      setPhotos([]);
      onPhotosAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить фотографии</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto py-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нажмите для загрузки файлов</p>
            <p className="text-sm text-muted-foreground mt-1">
              или перетащите файлы сюда
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {/* Photos List */}
          {photos.length > 0 && (
            <div className="mt-6 space-y-4">
              <Label>Загруженные фотографии</Label>
              <div className="grid grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="aspect-square relative">
                      <img
                        src={photo.preview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <Input
                        placeholder="Описание"
                        value={photo.description}
                        onChange={(e) => updatePhoto(index, { description: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Цена ₽"
                        value={photo.price}
                        onChange={(e) => updatePhoto(index, { price: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={photos.length === 0 || uploading}
          >
            {uploading ? 'Загрузка...' : `Загрузить (${photos.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
