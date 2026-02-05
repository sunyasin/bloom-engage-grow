import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GALLERY_BUCKET, GALLERY_THUMBNAILS_FOLDER, GALLERY_AUDIO_FOLDER, generateGalleryFileName } from '@/lib/galleryStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Play, Pause, Music, Shuffle, Repeat, Repeat1, Trash2 } from 'lucide-react';

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
  playback_mode: 'repeat_one' | 'repeat_all' | 'shuffle' | null;
}

interface GalleryAudioTrack {
  id?: number;
  url: string;
  audio_filename: string;
}

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  communities: Community[];
  onCollectionUpdated: () => void;
}

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB
const PLAYBACK_MODES = [
  { value: 'repeat_all', label: 'repeat_all', icon: Repeat },
  { value: 'repeat_one', label: 'repeat_one', icon: Repeat1 },
  { value: 'shuffle', label: 'shuffle', icon: Shuffle },
] as const;

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
  const [audioTracks, setAudioTracks] = useState<GalleryAudioTrack[]>([]);
  const [playbackMode, setPlaybackMode] = useState<'repeat_one' | 'repeat_all' | 'shuffle'>('repeat_all');
  const [newAudio, setNewAudio] = useState<File | null>(null);
  const [newAudioPreview, setNewAudioPreview] = useState<string | null>(null);
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
      setPlaybackMode(collection.playback_mode || 'repeat_all');
      setThumbnail(null);
      setNewAudio(null);
      setNewAudioPreview(null);
      setIsPlaying(false);
      // Загружаем аудио из gallery_audio
      loadCollectionAudio(collection.id);
    }
  }, [collection]);

  // Cleanup audio preview URL
  useEffect(() => {
    return () => {
      if (newAudioPreview) {
        URL.revokeObjectURL(newAudioPreview);
      }
    };
  }, [newAudioPreview]);

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Загрузка аудио записей для коллекции
  const loadCollectionAudio = async (collectionId: number) => {
    try {
      const { data } = await supabase
        .from('gallery_audio')
        .select('id, url, audio_filename')
        .eq('collection_id', collectionId)
        .order('id', { ascending: true });
      
      if (data) {
        setAudioTracks(data.map(t => ({
          id: t.id,
          url: t.url,
          audio_filename: t.audio_filename
        })));
      } else {
        setAudioTracks([]);
      }
    } catch (e) {
      setAudioTracks([]);
    }
  };

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
      if (newAudioPreview) {
        URL.revokeObjectURL(newAudioPreview);
      }
      setNewAudio(file);
      setNewAudioPreview(URL.createObjectURL(file));
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

  const removeAudioTrack = async (trackId: number) => {
    // Удаляем из БД
    await supabase
      .from('gallery_audio')
      .delete()
      .eq('id', trackId);
    
    // Удаляем из локального списка
    setAudioTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const togglePreviewPlayback = () => {
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

      // Upload new audio if exists
      if (newAudio) {
        const fileName = generateGalleryFileName(newAudio.name, GALLERY_AUDIO_FOLDER);
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(fileName, newAudio, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(GALLERY_BUCKET)
          .getPublicUrl(fileName);

        // Создаём новую запись в gallery_audio
        const { error: audioError } = await supabase
          .from('gallery_audio')
          .insert({
            collection_id: collection.id,
            url: publicUrl,
            audio_filename: newAudio.name
          });

        if (audioError) throw audioError;
      }

      // Update record in Supabase
      const { error } = await supabase
        .from('gallery_collections')
        .update({
          name,
          year: parseInt(year),
          community_id: communityId && communityId !== 'none' ? communityId : null,
          thumbnail_url: thumbnailUrl,
          playback_mode: playbackMode
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

  // Get current preview audio URL
  const previewAudioUrl = newAudioPreview || (audioTracks.length > 0 ? audioTracks[0].url : null);

  const currentMode = PLAYBACK_MODES.find(m => m.value === playbackMode) || PLAYBACK_MODES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Редактировать сборник</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[400px] pr-2">
          <form id="collection-form" onSubmit={handleSubmit}>
            <div className="grid gap-3 pb-4">
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

            {/* Audio Tracks */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Аудио треки</Label>
                {/* Playback Mode Selector */}
                <Select 
                  value={playbackMode} 
                  onValueChange={(v: 'repeat_one' | 'repeat_all' | 'shuffle') => setPlaybackMode(v)}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <currentMode.icon className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYBACK_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center">
                          <mode.icon className="h-4 w-4 mr-2" />
                          {mode.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {audioTracks.length > 0 ? (
                <div className="space-y-2">
                  {audioTracks.map((track, index) => (
                    <div 
                      key={track.id} 
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                    >
                      {/* Play/Pause */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (audioPlayerRef.current) {
                            audioPlayerRef.current.src = track.url;
                            audioPlayerRef.current.play().catch(() => {});
                            setIsPlaying(true);
                          }
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>

                      {/* Track name */}
                      <span className="flex-1 text-sm truncate">
                        {index + 1}. {track.audio_filename}
                      </span>

                      {/* Delete */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => track.id && removeAudioTrack(track.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет аудио треков</p>
              )}

              {/* Add new audio */}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newAudio ? newAudio.name : ''}
                  placeholder="Выберите файл"
                  readOnly
                  className="flex-1 bg-muted"
                />
                <div className="flex items-center gap-1">
                  {previewAudioUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={togglePreviewPlayback}
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
                  {newAudio && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => {
                        setNewAudio(null);
                        setNewAudioPreview(null);
                        if (audioInputRef.current) {
                          audioInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <audio
                  ref={audioPlayerRef}
                  src={previewAudioUrl || undefined}
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
          </form>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t mt-2 flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" form="collection-form" disabled={loading || !name.trim()}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
