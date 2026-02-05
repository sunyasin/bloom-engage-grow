import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Plus, Volume2, VolumeX, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface GalleryCollection {
  id: number;
  name: string;
  slideshow_speed: number;
}

interface GalleryPhoto {
  id: number;
  url: string;
  description: string | null;
  price: number | null;
}

interface GalleryPost {
  id: number;
  title: string | null;
  content_html: string;
  thumbnail_url: string | null;
  price: number | null;
}

interface GalleryAudioTrack {
  id: number;
  url: string;
  audio_filename: string;
}

export default function GalleryCarouselPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/my-gallery';
  const collectionIdNum = collectionId ? parseInt(collectionId) : null;
  
  const [collection, setCollection] = useState<GalleryCollection | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [audioTracks, setAudioTracks] = useState<GalleryAudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Audio state
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  // Edit description state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);

  const allItems = [...photos.map(p => ({ type: 'photo' as const, ...p })), ...posts.map(p => ({ type: 'post' as const, ...p }))];
  const currentItem = allItems[currentIndex];
  const hasAudio = audioTracks.length > 0;
  const currentTrack = audioTracks[currentTrackIndex];

  // Initialize speed from collection
  useEffect(() => {
    if (collection?.slideshow_speed) {
      setSpeed(collection.slideshow_speed);
    }
  }, [collection]);

  useEffect(() => {
    console.log('[DEBUG] isPlaying effect:', { isSlideshowPlaying, allItemsLength: allItems.length });
    if (isSlideshowPlaying && allItems.length > 1) {
      startSlideshow();
    } else {
      stopSlideshow();
    }
    return () => stopSlideshow();
  }, [isSlideshowPlaying, currentIndex, speed, allItems.length]);

  // Play current track when it changes
  useEffect(() => {
    console.log('[DEBUG] audio track effect:', { currentTrack, isAudioPlaying });
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isAudioPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack, isAudioPlaying]);

  // Handle audio ended - loop to first track
  const handleAudioEnded = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    setCurrentTrackIndex(nextIndex);
  }, [currentTrackIndex, audioTracks.length]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Autoplay audio when collection loads
  useEffect(() => {
    console.log('[DEBUG] autoplay effect:', { hasAudio, currentTrack, isAudioPlaying });
    if (hasAudio && currentTrack && isAudioPlaying) {
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
        } catch (e) {
          console.log('Audio autoplay blocked:', e);
        }
      };
      playAudio();
    }
  }, [hasAudio, currentTrack, isAudioPlaying]);

  const loadCollection = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('gallery_collections')
        .select('id, name, slideshow_speed')
        .eq('id', id)
        .single();
       
      if (error) throw error;
      setCollection(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadItems = async (id: number) => {
    try {
      setLoading(true);
       
      const [photosResult, postsResult, audioResult] = await Promise.all([
        supabase
          .from('gallery_photos')
          .select('id, url, description, price')
          .eq('collection_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('gallery_posts')
          .select('id, title, content_html, thumbnail_url, price')
          .eq('collection_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('gallery_audio')
          .select('id, url, audio_filename')
          .eq('collection_id', id)
          .order('id', { ascending: true })
      ]);

      if (photosResult.error) throw photosResult.error;
      if (postsResult.error) throw postsResult.error;

      setPhotos(photosResult.data || []);
      setPosts(postsResult.data || []);
      
      if (audioResult.data) {
        setAudioTracks(audioResult.data);
      }
    } catch (err: any) {
      if (err.message !== 'PGRST116') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collectionIdNum) {
      loadCollection(collectionIdNum);
      loadItems(collectionIdNum);
    }
  }, [collectionIdNum]);

  const startSlideshow = () => {
    stopSlideshow();
    slideshowRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % allItems.length);
    }, speed * 1000);
  };

  const stopSlideshow = () => {
    if (slideshowRef.current) {
      clearTimeout(slideshowRef.current);
      slideshowRef.current = null;
    }
  };

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % allItems.length);
  }, [allItems.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + allItems.length) % allItems.length);
  }, [allItems.length]);

  const goToNextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    setCurrentTrackIndex(nextIndex);
  };

  const goToPrevTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + audioTracks.length) % audioTracks.length;
    setCurrentTrackIndex(prevIndex);
  };

  const handleAddToOrder = () => {
    setOrderQuantity(prev => prev + 1);
  };

  const openEditDialog = () => {
    if (currentItem?.type === 'photo') {
      setEditDescription(currentItem.description || '');
      setIsEditDialogOpen(true);
    }
  };

  const saveDescription = async () => {
    if (currentItem?.type !== 'photo') return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gallery_photos')
        .update({ description: editDescription || null })
        .eq('id', currentItem.id);
      
      if (error) throw error;
      
      // Update local state
      setPhotos(prev => prev.map(p => 
        p.id === currentItem.id ? { ...p, description: editDescription || null } : p
      ));
      
      toast({ title: 'Сохранено', description: 'Описание обновлено' });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDescription = async () => {
    setEditDescription('');
  };

  const handlePlayPause = () => {
    console.log('[DEBUG] toggle slideshow:', !isSlideshowPlaying);
    setIsSlideshowPlaying(!isSlideshowPlaying);
  };

  const toggleAudioPlayPause = () => {
    console.log('[DEBUG] toggle audio:', !isAudioPlaying);
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
      } else {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) setIsMuted(false);
  };

  const handleSpeedChange = (value: number[]) => {
    setSpeed(value[0]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const currentPrice = currentItem?.type === 'photo' ? currentItem.price : currentItem?.type === 'post' ? currentItem.price : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>Назад</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Audio element */}
      {hasAudio && currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          onEnded={handleAudioEnded}
          autoPlay={isAudioPlaying}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{collection?.name}</h1>
        </div>
         
        {/* Audio player info */}
        {hasAudio && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{currentTrackIndex + 1}/{audioTracks.length}</span>
            <span>•</span>
            <span className="truncate max-w-[200px]">{currentTrack?.audio_filename}</span>
          </div>
        )}
      </div>

      {/* Carousel Area */}
      <div className="relative px-16 py-6">
        {/* Left Arrow */}
        {allItems.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Content */}
        <div className="aspect-[4/3] max-h-[60vh] flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          {currentItem ? (
            currentItem.type === 'photo' ? (
              <div className="flex flex-col items-center relative group">
                <img
                  src={currentItem.url}
                  alt=""
                  className="max-w-full max-h-[50vh] object-contain cursor-pointer"
                  onClick={openEditDialog}
                />
                {/* Edit button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={openEditDialog}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {currentItem.description && (
                  <p className="text-sm text-muted-foreground p-2 text-center max-h-16 overflow-y-auto">
                    {currentItem.description}
                  </p>
                )}
              </div>
            ) : (
              <div 
                className="w-full h-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: currentItem.content_html }}
              />
            )
          ) : (
            <p className="text-muted-foreground">Пусто</p>
          )}
        </div>

        {/* Right Arrow */}
        {allItems.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="flex items-center gap-4">
           {/* Audio Controls - слева */}
           {/* Всегда показываем для отладки */}
           <>
             <Button
               variant="ghost"
               size="icon"
               onClick={toggleAudioPlayPause}
             >
               {isAudioPlaying ? (
                 <Pause className="h-4 w-4" />
               ) : (
                 <Play className="h-4 w-4" />
               )}
             </Button>

             <div className="flex items-center gap-2">
               <Slider
                 value={[volume]}
                 onValueChange={handleVolumeChange}
                 min={0}
                 max={100}
                 step={1}
                 className="w-24"
               />
               <Button variant="ghost" size="icon" onClick={toggleMute}>
                 {isMuted || volume === 0 ? (
                   <VolumeX className="h-4 w-4" />
                 ) : (
                   <Volume2 className="h-4 w-4" />
                 )}
               </Button>
             </div>
           </>

          {/* Price */}
          {currentPrice !== null && currentPrice > 0 && (
            <span className="text-lg font-semibold">{currentPrice} ₽</span>
          )}

          {/* Add to Order */}
          {currentPrice !== null && currentPrice > 0 && (
            <Button variant="outline" size="icon" onClick={handleAddToOrder}>
              <Plus className="h-4 w-4" />
              {orderQuantity > 1 && (
                <span className="ml-1 text-sm">{orderQuantity}</span>
              )}
            </Button>
          )}

          {/* Speed slider */}
          <div className="flex items-center gap-2">
            <Slider
              value={[speed]}
              onValueChange={handleSpeedChange}
              min={1}
              max={60}
              step={1}
              className="w-24"
            />
            <span className="text-sm w-8">{speed}c</span>
          </div>

          {/* Play/Pause slideshow */}
          <Button variant="outline" size="icon" onClick={handlePlayPause}>
            {isSlideshowPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Edit Description Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Описание фото</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Введите описание..."
            rows={4}
          />
          <DialogFooter className="flex justify-between mt-4">
            <Button variant="outline" onClick={deleteDescription} disabled={!editDescription}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={saveDescription} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
