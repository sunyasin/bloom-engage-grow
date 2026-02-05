import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GALLERY_BUCKET, GALLERY_THUMBNAILS_FOLDER, GALLERY_AUDIO_FOLDER, generateGalleryFileName } from '@/lib/galleryStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Play, Pause, Music } from 'lucide-react';

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

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

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
  const [audio, setAudio] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFilename, setAudioFilename] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize form when collection changes
  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setYear(collection.year.toString());
      setCommunityId(collection.community_id || '');
      setThumbnailPreview(collection.thumbnail_url);
      setThumbnail(null);
      // Загружаем аудио из gallery_audio
      loadCollectionAudio(collection.id);
      setAudio(null);
      setAudioPreview(null);
      setIsPlaying(false);
    }
  }, [collection]);

  // Загрузка аудио записи для коллекции
  const loadCollectionAudio = async (collectionId: number) => {
    try {
      const { data } = await supabase
        .from('gallery_audio')
        .select('url, audio_filename')
        .eq('collection_id', collectionId)
        .limit(1)
        .single();
      
      if (data) {
        setAudioUrl(data.url);
        setAudioFilename(data.audio_filename);
      } else {
        setAudioUrl(null);
        setAudioFilename(null);
      }
    } catch (e) {
      // Записей может не быть - это нормально
      setAudioUrl(null);
      setAudioFilename(null);
    }
  };

  // Cleanup audio preview URL
  useEffect(() => {
    return () => {
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }
    };
  }, [audioPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_AUDIO_SIZE) {
      alert('Размер файла не должен превышать 10 МБ');
      return;
    }
    
    if (file.type.startsWith('audio/')) {
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }
      setAudio(file);
      setAudioFilename(file.name); // Сохраняем оригинальное имя
      setAudioPreview(URL.createObjectURL(file));
      setIsPlaying(false);
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

  const removeAudio = async () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }
    
    // Удаляем запись из gallery_audio
    if (collection) {
      await supabase
        .from('gallery_audio')
        .delete()
        .eq('collection_id', collection.id);
    }
    
    setAudio(null);
    setAudioUrl(null);
    setAudioFilename(null);
    setAudioPreview(null);
    setIsPlaying(false);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;
    
    setLoading(true);

    try {
      let thumbnailUrl: string | null = thumbnailPreview;
      let finalAudioUrl: string | null = audioUrl;
      let finalAudioFilename: string | null = audioFilename;

      // Upload thumbnail if new
      if (thumbnail) {
        const fileName = generateGalleryFileName('thumbnail.jpg', GALLERY_THUMBNAILS_FOLDER);
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(fileName, thumbnail, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(GALLERY_BUCKET)
          .getPublicUrl(fileName);

        thumbnailUrl = publicUrl;
      }

      // Upload audio if new
      if (audio) {
        const fileName = generateGalleryFileName(audio.name, GALLERY_AUDIO_FOLDER);
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(fileName, audio, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(GALLERY_BUCKET)
          .getPublicUrl(fileName);

        // Удаляем старую запись если есть
        await supabase
          .from('gallery_audio')
          .delete()
          .eq('collection_id', collection.id);

        // Создаём новую запись в gallery_audio
        const { error: audioError } = await supabase
          .from('gallery_audio')
          .insert({
            collection_id: collection.id,
            url: publicUrl,
            audio_filename: audio.name,
            playback_mode: 'repeat_all'
          });

        if (audioError) throw audioError;
      } else if (audioUrl && audioFilename) {
        // Аудио уже существует, ничего не делаем
      }

      // Update record in Supabase
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

      onCollectionUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine what filename to display
  const displayAudioName = audio ? audio.name : (audioFilename || (audioUrl ? 'Аудио трек' : ''));

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

            {/* Audio - последнее поле */}
            <div className="grid gap-2">
              <Label>Аудио</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={displayAudioName}
                  placeholder="Файл не выбран"
                  readOnly
                  className="flex-1 bg-muted"
                />
                <div className="flex items-center gap-1">
                  {audio || audioUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={toggleAudioPlayback}
                      disabled={!audio && !audioUrl}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  {audio || audioUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={removeAudio}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <audio
                  ref={audioPlayerRef}
                  src={audioPreview || audioUrl || undefined}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioSelect}
              />
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
